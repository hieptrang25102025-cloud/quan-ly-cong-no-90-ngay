-- Chạy trong Supabase → SQL Editor (chạy 1 lần).
-- Tạo kho lưu file PDF hóa đơn / biên bản nghiệm thu.

-- 1) Đảm bảo bảng invoices có 2 cột lưu đường dẫn file (nếu đã có thì bỏ qua)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_file_url    text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS acceptance_file_url text;

-- 2) Tạo bucket RIÊNG TƯ (private) – file chỉ xem được qua link tạm có thời hạn
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoice-files', 'invoice-files', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['application/pdf'];

-- 3) Quyền đọc / tải lên / thay / xóa file trong bucket này (app chưa có đăng nhập nên dùng khóa anon)
DROP POLICY IF EXISTS "invoice_files_select" ON storage.objects;
DROP POLICY IF EXISTS "invoice_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "invoice_files_update" ON storage.objects;
DROP POLICY IF EXISTS "invoice_files_delete" ON storage.objects;

CREATE POLICY "invoice_files_select" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'invoice-files');
CREATE POLICY "invoice_files_insert" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'invoice-files');
CREATE POLICY "invoice_files_update" ON storage.objects FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'invoice-files') WITH CHECK (bucket_id = 'invoice-files');
CREATE POLICY "invoice_files_delete" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'invoice-files');
