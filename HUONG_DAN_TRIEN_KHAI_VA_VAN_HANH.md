# HƯỚNG DẪN CHI TIẾT CÀI ĐẶT, TRIỂN KHAI VÀ VẬN HÀNH WEBSITE QUẢN LÝ CÔNG NỢ 90 NGÀY

> **Dành cho:** HỘ KINH DOANH TRẦN THẢO TRANG (Bên A)  
> **Mục tiêu:** Quản lý công nợ hợp đồng nguyên tắc 90 ngày, tự động tính phạt 0,1%/ngày, cảnh báo hạn thanh toán và theo dõi đôn đốc thu hồi nợ độc lập, máy tính tắt lịch vẫn chạy trên máy chủ đám mây.

---

## MỤC LỤC

1. [Tổng Quan Kiến Trúc & Cấu Trúc Dự Án](#1-tổng-quan-kiến-trúc)
2. [Các Công Cụ & Tài Khoản Cần Chuẩn Bị](#2-chuẩn-bị-công-cụ-và-tài-khoản)
3. [Chạy Thử Nghiệm Website Trên Máy Tính Của Bạn](#3-chạy-cục-bộ-trên-windows)
4. [Khởi Tạo Supabase & Chạy Migration Cơ Sở Dữ Liệu](#4-khởi-tạo-supabase)
5. [Đưa Mã Nguồn Lên GitHub & Triển Khai Lên Vercel](#5-triển-khai-vercel)
6. [Cấu Hình Tác Vụ Tự Động Chạy 09:00 Sáng (Khi Laptop Tắt)](#6-cấu-hình-cron-job-tự-động)
7. [Cấu Hình Email Báo Cáo Tổng Hợp (Chỉ Gửi Cho Bạn)](#7-cấu-hình-email-tổng-hợp)
8. [Quy Trình Vận Hành Hằng Ngày Cho Chủ Hộ Kinh Doanh](#8-vận-hành-hằng-ngày)
9. [Kế Hoạch Sao Lưu & Phục Hồi Dữ Liệu Độc Lập](#9-sao-lưu-và-phục-hồi)
10. [Xử Lý Các Tình Huống & Lỗi Thường Gặp](#10-xử-lý-lỗi-thường-gặp)

---

## 1. TỔNG QUAN KIẾN TRÚC

Hệ thống được thiết kế hoàn chỉnh theo mô hình Serverless hiện đại:
- **Giao diện & Ứng dụng:** Next.js App Router (React 18, TypeScript, Tailwind CSS), giao diện 100% tiếng Việt, tối ưu màn hình laptop Windows và điện thoại di động.
- **Cơ sở dữ liệu đám mây:** Supabase PostgreSQL với bảo mật Row Level Security (RLS), khóa chống trùng lặp `dedup_key` tuyệt đối.
- **Tác vụ định kỳ (Cron Job):** Chạy trên máy chủ đám mây lúc **09:00 sáng mỗi ngày** theo giờ Việt Nam (`Asia/Ho_Chi_Minh` = 02:00 UTC). **Không phụ thuộc vào laptop của bạn bật hay tắt.**
- **Nguyên tắc Email:** **TUYỆT ĐỐI KHÔNG gửi email tự động cho khách hàng.** Email chỉ gửi tóm tắt cho chính bạn nếu bạn bật trong phần Cài đặt.
- **Tính toán tiền phạt:** Phạt tạm tính = `Dư nợ gốc chậm trả × 0,1%/ngày × Số ngày quá hạn`. Không tự cộng vào gốc hóa đơn.

---

## 2. CHUẨN BỊ CÔNG CỤ VÀ TÀI KHOẢN

Bạn chỉ cần tạo các tài khoản miễn phí sau (không tốn chi phí):

1. **Tài khoản Supabase** (Cơ sở dữ liệu miễn phí): Đăng ký tại [supabase.com](https://supabase.com).
2. **Tài khoản Vercel** (Máy chủ web chạy miễn phí): Đăng ký tại [vercel.com](https://vercel.com).
3. **Tài khoản GitHub** (Để lưu trữ mã nguồn an toàn): Đăng ký tại [github.com](https://github.com).
4. **Tài khoản Resend** (Nếu muốn nhận email báo cáo tổng hợp vào 09:00 sáng): Đăng ký miễn phí tại [resend.com](https://resend.com).

*(Lưu ý: Môi trường Windows của bạn đã được cài đặt sẵn Node.js v20, npm và Git).*

---

## 3. CHẠY THỬ NGHIỆM WEBSITE TRÊN MÁY TÍNH CỦA BẠN

Mã nguồn đã được tạo đầy đủ tại:
`C:\Users\HP\.gemini\antigravity\scratch\quan-ly-cong-no-90-ngay`

### Bước 1: Mở PowerShell và truy cập thư mục dự án
```powershell
cd "C:\Users\HP\.gemini\antigravity\scratch\quan-ly-cong-no-90-ngay"
```

### Bước 2: Chạy kiểm thử tự động 20 kịch bản nghiệp vụ
```powershell
npm test
```
*Kết quả:* Hệ thống sẽ chạy và thông báo xanh: `✓ tests/debt-engine.test.ts (20 tests passed)`.

### Bước 3: Khởi động giao diện website
```powershell
npm run dev
```
Sau đó mở trình duyệt (Chrome/Edge) truy cập: **`http://localhost:3000`**  
Bạn sẽ thấy toàn bộ giao diện quản lý công nợ với dữ liệu thực tế của:
- **Công ty 1:** CÔNG TY TNHH XÂY DỰNG MÔI TRƯỜNG XANH (HĐ 138 xe 51D-099.44, 5.500.000 VNĐ).
- **Công ty 2:** CÔNG TY TNHH GIẢI PHÁP TVXD KHÔNG GIAN XANH (MST: 0313505841, Đại diện: Ông Nguyễn Mạnh Cường - Giám đốc, Số 214A đường số 5, KP3, P. Bình Hưng Hòa, TP.HCM, TK 206426269 tại ACB Gò Mây).

---

## 4. KHỞI TẠO SUPABASE & CHẠY MIGRATION CƠ SỞ DỮ LIỆU

### Bước 1: Tạo Project mới trên Supabase
1. Đăng nhập [Supabase Dashboard](https://supabase.com/dashboard).
2. Bấm **New Project**.
3. Điền thông tin:
   - **Name:** `quan-ly-cong-no-90-ngay`
   - **Database Password:** Đặt mật khẩu an toàn (lưu lại mật khẩu này).
   - **Region:** Chọn `Southeast Asia (Singapore)` để có tốc độ kết nối nhanh nhất về Việt Nam.
4. Bấm **Create new project** và chờ khoảng 2 phút.

### Bước 2: Chạy Script khởi tạo bảng (Schema Migration)
1. Trong thanh menu bên trái của Supabase, bấm vào biểu tượng **SQL Editor**.
2. Mở file mã nguồn:  
   `supabase/migrations/20261022000001_create_debt_management_schema.sql`
3. Sao chép toàn bộ nội dung file và dán vào ô SQL Editor trên Supabase.
4. Bấm nút **Run** (màu xanh).  
   *Hệ thống sẽ tạo tự động 13 bảng: companies, contracts, invoices, payments, notifications, contact_histories, payment_promises, app_settings, scheduled_job_runs... cùng các trigger tự động cập nhật số dư.*

### Bước 3: Nạp dữ liệu ban đầu (Seed Data)
1. Mở file: `supabase/seed.sql`.
2. Sao chép nội dung và dán vào ô SQL Editor trên Supabase.
3. Bấm **Run**.  
   *Hai công ty đối tác và các hóa đơn thực tế của bạn sẽ được nạp ngay vào cơ sở dữ liệu.*

### Bước 4: Lấy thông tin kết nối
Vào mục **Project Settings** > **API**:
- Sao chép **Project URL**.
- Sao chép **anon public key**.

---

## 5. ĐƯA MÃ NGUỒN LÊN GITHUB VÀ TRIỂN KHAI LÊN VERCEL

### Bước 1: Đưa mã nguồn lên GitHub
Trong cửa sổ PowerShell:
```powershell
cd "C:\Users\HP\.gemini\antigravity\scratch\quan-ly-cong-no-90-ngay"
git init
git add .
git commit -m "Khoi tao he thong quan ly cong no 90 ngay hoan chinh"
```
Tạo một repository mới trên GitHub (chế độ Private để bảo mật thông tin nội bộ), sau đó liên kết và đẩy code lên:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/quan-ly-cong-no-90-ngay.git
git branch -M main
git push -u origin main
```

### Bước 2: Triển khai lên Vercel
1. Đăng nhập [Vercel](https://vercel.com).
2. Bấm **Add New...** > **Project**.
3. Chọn kho mã nguồn `quan-ly-cong-no-90-ngay` vừa đẩy lên GitHub.
4. Trong mục **Environment Variables** (Biến môi trường), thêm các biến sau:
   - `NEXT_PUBLIC_SUPABASE_URL` = [Project URL từ Supabase]
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = [Anon Key từ Supabase]
   - `CRON_SECRET` = `mat-khau-cron-tu-chon-12345`
   - `NEXT_PUBLIC_TIMEZONE` = `Asia/Ho_Chi_Minh`
   - `RESEND_API_KEY` = [API Key nếu dùng gửi mail, nếu chưa có có thể bỏ trống]
5. Bấm **Deploy**.
6. Chờ khoảng 1 - 2 phút, Vercel sẽ cấp cho bạn một đường link website chính thức trên Internet (ví dụ: `https://quan-ly-cong-no-90-ngay.vercel.app`).

---

## 6. CẤU HÌNH TÁC VỤ TỰ ĐỘNG CHẠY 09:00 SÁNG (KHI LAPTOP TẮT)

Hệ thống hỗ trợ 2 cơ chế độc lập giúp tác vụ luôn luôn chạy đúng 09:00 sáng kể cả khi máy tính của bạn tắt:

### Cách 1: Vercel Cron (Đã cấu hình sẵn trong file `vercel.json`)
File `vercel.json` trong dự án đã cấu hình:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-debts",
      "schedule": "0 2 * * *"
    }
  ]
}
```
*(Giải thích: 02:00 UTC chính xác là **09:00 sáng** giờ Việt Nam UTC+7).*  
Khi triển khai lên Vercel, Vercel sẽ tự động gọi endpoint này mỗi sáng.

### Cách 2: Supabase pg_cron (Trực tiếp trong cơ sở dữ liệu)
Trong Supabase SQL Editor, bạn chỉ cần chạy lệnh sau:
```sql
SELECT cron.schedule('daily-debt-check-09am', '0 2 * * *', 'SELECT public.fn_run_daily_debt_check()');
```
*Hàm `fn_run_daily_debt_check()` sẽ tự động chạy trong lõi PostgreSQL, quét mọi hóa đơn, tính tiền phạt chậm trả, và sinh cảnh báo vào bảng `notifications`.*

---

## 7. CẤU HÌNH EMAIL BÁO CÁO TỔNG HỢP (CHỈ GỬI CHO BẠN)

1. Đăng ký tài khoản tại [Resend](https://resend.com).
2. Bấm **Create API Key**, sao chép mã khóa có dạng `re_xxxxxxxxx`.
3. Thêm biến môi trường `RESEND_API_KEY` trên Vercel.
4. Mở website của bạn, vào phân hệ **Cài đặt hệ thống**:
   - Bật công tắc **Email Báo Cáo Tổng Hợp Định Kỳ**.
   - Bấm nút **Gửi thử email tổng hợp cho chính tôi ngay** để kiểm tra hộp thư đến của bạn (`hieptrang25102025@gmail.com`).

---

## 8. QUY TRÌNH VẬN HÀNH HẰNG NGÀY CHO CHỦ HỘ KINH DOANH

1. **Đầu ngày (sau 09:00 sáng):**
   - Mở website trên laptop hoặc điện thoại.
   - Nhìn vào **chuông thông báo**: Xem có hóa đơn nào sắp đến hạn (15, 7, 3 ngày), đến hạn hôm nay hoặc quá hạn cần xử lý hay không.
2. **Khi chuẩn bị liên hệ khách hàng:**
   - Xem chi tiết công nợ: Số tiền nợ gốc, số ngày quá hạn, tiền phạt tạm tính đối chiếu (0,1%/ngày).
   - Gọi điện, nhắn Zalo hoặc gửi email trao đổi trực tiếp với kế toán / giám đốc công ty khách hàng.
3. **Sau khi liên hệ xong:**
   - Vào phân hệ **Lịch sử liên hệ** > Bấm **Ghi nhận liên hệ mới**:
     * Chọn hóa đơn.
     * Nhập người trao đổi và tóm tắt nội dung.
     * Nếu khách hẹn ngày chuyển khoản (ví dụ: ngày 25/10), chọn kết quả **Khách hẹn ngày thanh toán** và nhập ngày hẹn. Hệ thống sẽ tự động nhắc bạn vào đúng ngày hẹn nếu chưa thấy tiền về.
4. **Khi nhận được tiền chuyển khoản:**
   - Vào phân hệ **Ghi nhận thanh toán**:
     * Chọn hóa đơn.
     * Nhập số tiền nhận được (hỗ trợ thanh toán nhiều lần/trả dần).
     * Nhập mã giao dịch ngân hàng để đối chiếu.
     * Bấm **Lưu thanh toán**. Hệ thống tự động giảm số dư nợ và tính lại tiền phạt trên số tiền còn thiếu. Khi trả đủ, hệ thống tự động tắt cảnh báo đôn đốc.
5. **Cuối tháng / Cuối quý:**
   - Vào phân hệ **Báo cáo & Excel** > Bấm **Xuất file Excel (.xlsx)** để lưu trữ bản báo cáo đầy đủ có định dạng tiền VNĐ và ngày dd/mm/yyyy.

---

## 9. SAO LƯU VÀ PHỤC HỒI DỮ LIỆU ĐỘC LẬP

### Cách 1: Tải trực tiếp trên giao diện
Vào mục **Cài đặt hệ thống** > Bấm **Tải về bản sao lưu dự phòng (.json)** để lưu ngay một bản toàn bộ công nợ về máy tính.

### Cách 2: Chạy script độc lập trong thư mục dự án
Tạo bản sao lưu kèm mã băm SHA-256 xác thực:
```powershell
npm run backup
```
*Tệp sao lưu sẽ được lưu tại thư mục `backups/backup_YYYY-MM-DD.json`.*

Kiểm tra tính toàn vẹn và phục hồi thử nghiệm:
```powershell
npm run restore
```
*Hệ thống sẽ đối soát mã băm SHA-256 để đảm bảo dữ liệu không bị hỏng hóc hay thay đổi trái phép.*

---

## 10. XỬ LÝ LỖI THƯỜNG GẶP

1. **Khách hàng xin lùi ngày thanh toán:**
   - Vào danh sách hóa đơn, bấm nút **Gia hạn**.
   - Chọn ngày hẹn mới và nhập lý do gia hạn. Hệ thống sẽ tính số ngày quá hạn theo hạn mới và giữ nguyên lịch sử hạn cũ để bạn đối soát.
2. **Khách hàng đang khiếu nại hoặc đối soát linh kiện:**
   - Bấm nút **Dừng (Tạm dừng)** trên hóa đơn đó. Hệ thống sẽ ngưng gửi cảnh báo lặp lại hàng ngày để tránh làm phiền, nhưng hóa đơn vẫn xuất hiện trên Dashboard để theo dõi.
3. **Thanh toán nhiều lần (trả góp):**
   - Không sửa trực tiếp giá trị hóa đơn. Hãy vào **Ghi nhận thanh toán** để tạo từng đợt trả tiền. Hệ thống sẽ tự động cộng dồn và chỉ tính phạt trên số tiền còn thiếu.
4. **Không nhớ hạn 90 ngày tính từ ngày nào:**
   - Hệ thống luôn căn cứ vào **Ngày Bên B nhận đủ HĐĐT và BBNT**. Nếu chưa có ngày này, hệ thống sẽ gắn nhãn màu xám "Thiếu hồ sơ" để nhắc bạn bổ sung, không tự ý suy đoán ngày.

---

*Hệ thống đã sẵn sàng đưa vào sử dụng ngay để quản lý công nợ chặt chẽ và chuyên nghiệp cho hộ kinh doanh của bạn.*
