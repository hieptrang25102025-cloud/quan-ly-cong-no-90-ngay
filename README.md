# HỆ THỐNG QUẢN LÝ CÔNG NỢ 90 NGÀY — TỰ ĐỘNG TÍNH PHẠT & THEO DÕI THU HỒI NỢ

Hệ thống phần mềm quản lý công nợ theo hợp đồng nguyên tắc 90 ngày, tự động tính phạt chậm thanh toán 0,1%/ngày trên tiền gốc chậm trả, tự động phát sinh cảnh báo tại trung tâm thông báo và cho phép theo dõi đôn đốc thu hồi nợ chuyên nghiệp.

## 🛠️ Công Nghệ Sử Dụng
- **Frontend / Ứng dụng:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend / Database:** Supabase PostgreSQL, Row Level Security (RLS), Triggers.
- **Kiểm thử tự động:** Vitest (Đạt 20/20 kịch bản kiểm thử nghiệp vụ bắt buộc).
- **Xuất dữ liệu:** Thư viện `xlsx` tạo file Excel chuẩn VNĐ và ngày dd/mm/yyyy.
- **Tự động hóa:** Vercel Cron & Supabase pg_cron (chạy định kỳ lúc 09:00 AM giờ Việt Nam = 02:00 UTC).
- **Sao lưu:** Kịch bản sao lưu & phục hồi độc lập có mã băm SHA-256 xác thực toàn vẹn dữ liệu.

## 🚀 Khởi Chạy Nhanh Trên Máy Tính
```powershell
# Di chuyển vào thư mục dự án
cd "C:\Users\HP\.gemini\antigravity\scratch\quan-ly-cong-no-90-ngay"

# Chạy kiểm thử tự động 20 kịch bản nghiệp vụ
npm test

# Chạy thử nghiệm sao lưu và phục hồi dữ liệu
npm run backup
npm run restore

# Khởi chạy giao diện website
npm run dev
```
Truy cập website tại: [http://localhost:3000](http://localhost:3000)

## 📖 Hướng Dẫn Chi Tiết
Xem tài liệu hướng dẫn đầy đủ từng bước triển khai lên Supabase và Vercel tại:
[HUONG_DAN_TRIEN_KHAI_VA_VAN_HANH.md](./HUONG_DAN_TRIEN_KHAI_VA_VAN_HANH.md)
