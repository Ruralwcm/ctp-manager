/***********************************************************
 * CTP Manager — Backend (Google Apps Script)
 * Khai báo → Valid → Phê duyệt công tác phí (CTP)
 *
 * Cấu trúc Sheet (spreadsheet chứa script):
 *   - "5-Users": Mã NV | Tên | Role | GĐV
 *   - "CTP_Data": ID | Mã NV | Tên | Role | GĐV | Loại | Điểm đi | Điểm đến |
 *                 Km | Số ngày | Ngày đi | Ngày về | CTP | KS | Xăng | Tổng |
 *                 Ghi chú | Trạng thái | Ngày tạo | Lý do từ chối | Valid warn
 *
 * Response format: { success: bool, data: any, error?: string }
 ***********************************************************/

var SS = SpreadsheetApp.getActiveSpreadsheet();
var SHEET_USERS = "5-Users";
var SHEET_REC = "CTP_Data";

function doGet(e) {
  var p = {};
  if (e && e.parameter) {
    for (var k in e.parameter) {
      if (e.parameter.hasOwnProperty(k)) p[k] = e.parameter[k];
    }
  }
  return ContentService.createTextOutput(JSON.stringify(route(p)))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = {};
  if (e && e.postData && e.postData.contents) {
    var ct = e.postData.type || '';
    if (ct.indexOf('application/x-www-form-urlencoded') >= 0 || ct.indexOf('application/json') >= 0) {
      try { body = JSON.parse(e.postData.contents); } catch (_) {
        var params = new URLSearchParams(e.postData.contents);
        body = { action: params.get('action') || '' };
        try { body.data = JSON.parse(params.get('data') || '{}'); } catch (_) { body.data = params.get('data') || {}; }
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify(route(body)))
    .setMimeType(ContentService.MimeType.JSON);
}

function route(p) {
  p = p || {};
  var action = p.action || (p.parameter && p.parameter.action);
  var data = (typeof p.data === 'object' && p.data !== null) ? p.data : p;
  try {
    switch (action) {
      case "nhanSu":    return { success: true, data: getUsers() };
      case "getUsers":  return { success: true, data: getUsers() }; // backward compat
      case "records":   return list(data);
      case "list":      return list(data); // backward compat
      case "submit":    return submit(data);
      case "approve":   return approve(data);
      case "reject":    return reject(data);
      case "budget":    return budget(data);
      case "login":     return login(data);
      default:          return { success: false, error: "Unknown action: " + action };
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// =================== DATA ACCESS ===================

function getUsers() {
  var sh = SS.getSheetByName(SHEET_USERS);
  if (!sh) return [];
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    out.push({
      maNV: String(r[0]).trim(),
      ten: r[1] || "",
      chucVu: r[2] || "NV",   // frontend expects chucVu
      role: r[2] || "NV",      // kept for backward compat
      gdv: r[3] || ""
    });
  }
  return out;
}

function login(d) {
  var users = getUsers();
  var ma = String(d.maNV || "").trim();
  if (!ma) return { success: false, error: "Vui lòng nhập Mã NV" };
  var u = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].maNV.toLowerCase() === ma.toLowerCase()) { u = users[i]; break; }
  }
  if (!u) return { success: false, error: "Không tìm thấy mã NV" };
  return { success: true, data: u };
}

// =================== RECORDS ===================

var REC_HEADER = ["ID","Mã NV","Tên","Role","GĐV","Loại","Điểm đi","Điểm đến",
  "Km","Số ngày","Ngày đi","Ngày về","CTP","KS","Xăng","Tổng",
  "Ghi chú","Trạng thái","Ngày tạo","Lý do từ chối","Valid warn"];

function ensureRecSheet() {
  var sh = SS.getSheetByName(SHEET_REC);
  if (!sh) {
    sh = SS.insertSheet(SHEET_REC);
    if (REC_HEADER.length) sh.appendRow(REC_HEADER);
  }
  return sh;
}

function submit(d) {
  ensureRecSheet();
  var sh = SS.getSheetByName(SHEET_REC);
  var id = String(new Date().getTime());
  var ten = d.ten || "";
  var role = d.chucVu || d.role || "NV";
  var gdv = d.gdv || "";
  
  sh.appendRow([
    id, d.maNV || "", ten, role, gdv,
    d.loai || "", d.maCH || "", d.denMA || "",
    d.km || 0, d.soNgay || 0, d.ngayDi || "", d.ngayVe || "",
    d.ctp || 0, d.ks || 0, d.xang || 0, d.tong || 0,
    d.mucDich || "", d.trangThai || "cho_gdv", d.ngayTao || "",
    "", (d.validWarn || []).join("; ")
  ]);
  return { success: true, data: { id: id } };
}

function list(d) {
  var sh = SS.getSheetByName(SHEET_REC);
  if (!sh) return { success: true, data: [] };
  var rows = sh.getDataRange().getValues();
  if (rows.length < 2) return { success: true, data: [] };
  
  var head = rows[0], out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var obj = {};
    for (var c = 0; c < head.length; c++) {
      obj[String(head[c]).trim()] = r[c];
    }
    obj.id = String(r[0]);
    
    // Filter by gdv or maNV if provided
    if (d.gdv && obj["GĐV"] !== d.gdv) continue;
    if (d.maNV && obj["Mã NV"] !== d.maNV) continue;
    
    out.push(obj);
  }
  return { success: true, data: out };
}

function approve(d) {
  var sh = SS.getSheetByName(SHEET_REC);
  if (!sh) return { success: false, error: "No data sheet" };
  var rows = sh.getDataRange().getValues();
  if (rows.length < 2) return { success: false, error: "No records" };
  
  var head = rows[0];
  var statusCol = -1;
  for (var c = 0; c < head.length; c++) {
    if (String(head[c]).trim() === "Trạng thái") { statusCol = c; break; }
  }
  if (statusCol < 0) return { success: false, error: "Status column not found" };
  
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.id)) {
      sh.getRange(i + 1, statusCol + 1).setValue(d.trangThai || "done");
      return { success: true, data: { id: d.id } };
    }
  }
  return { success: false, error: "Không tìm thấy phiếu" };
}

function reject(d) {
  var sh = SS.getSheetByName(SHEET_REC);
  if (!sh) return { success: false, error: "No data sheet" };
  var rows = sh.getDataRange().getValues();
  if (rows.length < 2) return { success: false, error: "No records" };
  
  var head = rows[0], statusCol = -1, lyDoCol = -1;
  for (var c = 0; c < head.length; c++) {
    if (String(head[c]).trim() === "Trạng thái") statusCol = c;
    if (String(head[c]).trim() === "Lý do từ chối") lyDoCol = c;
  }
  if (statusCol < 0) return { success: false, error: "Status column not found" };
  
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.id)) {
      sh.getRange(i + 1, statusCol + 1).setValue("tu_choi");
      if (lyDoCol >= 0) sh.getRange(i + 1, lyDoCol + 1).setValue(d.lyDo || "");
      return { success: true, data: { id: d.id } };
    }
  }
  return { success: false, error: "Không tìm thấy phiếu" };
}

function budget(d) {
  return { success: true, data: {} };
}