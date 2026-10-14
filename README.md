# CTP Manager — Khai báo · Valid · Phê duyệt Công tác phí

Web app quản lý luồng công tác phí (CTP) theo 7 nguyên tắc điều động nhân sự hỗ trợ NSO.

## Luồng (Flow)
1. **Khai báo** — NVCH/QLKV khai báo chuyến công tác (loại, điểm đi/đến, khoảng cách, số ngày, chi phí CTP/KS/Xăng)
2. **Valid** — hệ thống tự động kiểm tra theo nguyên tắc:
   - Khoảng cách ≤ 30km → không hỗ trợ CP (NVCH tự túc)
   - Khoảng cách > 80km → chỉ QLKV/đội NSO chuyên trách
   - Số ngày > 2 → cần GĐM duyệt
   - Vượt ngân sách GĐV còn lại → cảnh báo
3. **Phê duyệt** — GĐV duyệt cấp 1 → GĐM duyệt cấp 2 (trường hợp vượt định mức)

## Công thức ngân sách
```
Budget tháng = [3tr + CH × 250k + NSO × 2.5tr] × K_vùng
```

## Phân quyền
| Role  | Quyền |
|-------|-------|
| NV (NVCH) | Khai báo CTP |
| QLKV      | Khai báo + điều động (ưu tiên NSO xa) |
| GĐV       | Khai báo + Phê duyệt cấp 1 (≤80km, ≤2 ngày) |
| GĐM       | Phê duyệt cấp 2 (ngoại lệ, >80km, >2 ngày) |
| ADMIN     | Toàn quyền |

## Cài đặt backend (Google Apps Script)
1. Tạo Google Sheet mới → Extensions > Apps Script
2. Dán nội dung `Code.gs` → Lưu
3. Deploy > New deployment > Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy Web app URL → dán vào biến `GAS_URL` trong `index.html`

## Demo (không cần backend)
- Trang chạy ngay với localStorage (dữ liệu lưu trên máy).
- Mã NV demo: `NV001` (NVCH) · `GDV001` (GĐV Hồ Nam) · `GDM001` (GĐM Hảo) · `ADMIN`

## Sheet cần tạo (backend)
- `5-Users`: Mã NV | Tên | Role | GĐV
- `CTP_Data`: tự tạo khi có khai báo đầu tiên

## Deploy
- GitHub Pages: https://ruralwcm.github.io/ctp-manager/
