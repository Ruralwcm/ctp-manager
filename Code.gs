/***********************************************************
 * CTP Manager — Backend (Google Apps Script)
 * Khai báo → Valid → Phê duyệt công tác phí (CTP)
 *
 * Cấu trúc Sheet (spreadsheet chứa script):
 *   - "5-Users": Mã NV | Tên | Role | GĐV   (dùng chung với Portal/CTKM nếu có)
 *   - "CTP_Data": ID | Mã NV | Tên | Role | GĐV | Loại | Điểm đi | Điểm đến |
 *                 Km | Số ngày | Ngày đi | Ngày về | CTP | KS | Xăng | Tổng |
 *                 Ghi chú | Trạng thái | Ngày tạo | Lý do từ chối | Valid warn
 *
 * Cài đặt:
 *   1. Tạo Google Sheet mới (hoặc dùng sheet chung), vào Extensions > Apps Script
 *   2. Dán toàn bộ file này, lưu
 *   3. Deploy > New deployment > Web app > Execute as: Me > Access: Anyone
 *   4. Copy Web app URL → dán vào GAS_URL trong index.html
 ***********************************************************/

var SS = SpreadsheetApp.getActiveSpreadsheet();
var SHEET_REC = "CTP_Data";
var SHEET_USERS = "5-Users";

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify(route(e)))
    .setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  var body = e && e.postData ? JSON.parse(e.postData.contents) : {};
  return ContentService.createTextOutput(JSON.stringify(route(body)))
    .setMimeType(ContentService.MimeType.JSON);
}

function route(p) {
  p = p || {};
  var action = p.action || (p.parameter && p.parameter.action);
  var data = p.data || p;
  try {
    switch (action) {
      case "login":      return login(data);
      case "getUsers":   return { ok: true, users: getUsers() };
      case "submit":     return submit(data);
      case "list":       return list(data);
      case "approve":    return approve(data);
      case "reject":     return reject(data);
      case "budget":     return budget(data);
      default:           return { ok: false, msg: "Unknown action: " + action };
    }
  } catch (err) {
    return { ok: false, msg: String(err) };
  }
}

function ensureSheet(name, header) {
  var sh = SS.getSheetByName(name);
  if (!sh) {
    sh = SS.insertSheet(name);
    if (header && header.length) sh.appendRow(header);
  }
  return sh;
}

function getUsers() {
  var sh = SS.getSheetByName(SHEET_USERS);
  if (!sh) return [];
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    out.push({ maNV: String(r[0]), ten: r[1] || "", role: r[2] || "NV", gdv: r[3] || "" });
  }
  return out;
}

function login(d) {
  var users = getUsers();
  var u = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].maNV).toLowerCase() === String(d.maNV || "").toLowerCase()) { u = users[i]; break; }
  }
  if (!u) return { ok: false, msg: "Không tìm thấy mã NV" };
  return { ok: true, user: u };
}

function submit(d) {
  ensureSheet(SHEET_REC, ["ID","Mã NV","Tên","Role","GĐV","Loại","Điểm đi","Điểm đến","Km","Số ngày","Ngày đi","Ngày về","CTP","KS","Xăng","Tổng","Ghi chú","Trạng thái","Ngày tạo","Lý do từ chối","Valid warn"]);
  var sh = SS.getSheetByName(SHEET_REC);
  var id = String(new Date().getTime());
  sh.appendRow([
    id, d.maNV, d.ten, d.role, d.gdv, d.loai, d.di, d.den, d.km, d.soNgay,
    d.ngayDi, d.ngayVe, d.ctp, d.ks, d.xang, d.tong, d.ghiChu,
    d.trangThai || "cho_gdv", d.ngayTao || "", "", (d.validWarn || []).join("; ")
  ]);
  return { ok: true, id: id };
}

function list(d) {
  var sh = SS.getSheetByName(SHEET_REC);
  if (!sh) return { ok: true, records: [] };
  var rows = sh.getDataRange().getValues();
  var head = rows[0], out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var o = {};
    for (var c = 0; c < head.length; c++) o[head[c]] = r[c];
    o.id = r[0];
    out.push(o);
  }
  return { ok: true, records: out };
}

function approve(d) {
  var sh = SS.getSheetByName(SHEET_REC);
  if (!sh) return { ok: false, msg: "No sheet" };
  var rows = sh.getDataRange().getValues();
  var idCol = 0, statusCol = rows[0].indexOf("Trạng thái");
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(d.id)) {
      sh.getRange(i + 1, statusCol + 1).setValue(d.trangThai || "done");
      return { ok: true };
    }
  }
  return { ok: false, msg: "Không tìm thấy phiếu" };
}

function reject(d) {
  var sh = SS.getSheetByName(SHEET_REC);
  if (!sh) return { ok: false, msg: "No sheet" };
  var rows = sh.getDataRange().getValues();
  var idCol = 0, statusCol = rows[0].indexOf("Trạng thái"), lyDoCol = rows[0].indexOf("Lý do từ chối");
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(d.id)) {
      sh.getRange(i + 1, statusCol + 1).setValue("tu_choi");
      if (lyDoCol >= 0) sh.getRange(i + 1, lyDoCol + 1).setValue(d.lyDo || "");
      return { ok: true };
    }
  }
  return { ok: false, msg: "Không tìm thấy phiếu" };
}

function budget(d) {
  // Trả về ngân sách theo GĐV — dữ liệu gốc lấy từ Storelist + công thức (client giữ GDV_BUDGET)
  return { ok: true };
}
