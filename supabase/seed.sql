-- ====================================================================
-- DỮ LIỆU KHỞI TẠO BAN ĐẦU DỰA TRÊN THỰC TẾ DOANH NGHIỆP CỦA BẠN
-- ====================================================================

-- 1. CÔNG TY 1: CÔNG TY TNHH XÂY DỰNG MÔI TRƯỜNG XANH
INSERT INTO public.companies (
    id,
    name,
    tax_code,
    address,
    contact_person,
    contact_email,
    contact_phone,
    bank_account,
    bank_name,
    notes,
    status
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'CÔNG TY TNHH XÂY DỰNG MÔI TRƯỜNG XANH',
    '0304599836',
    'Số 214 đường số 5, Khu Phố 3, Phường Bình Hưng Hòa, TP Hồ Chí Minh, Việt Nam',
    'TRẦN ANH TUẤN (Giám đốc)',
    'ketoan.moitruongxanh@gmail.com',
    '0908123456',
    '130993789',
    'Ngân hàng Á Châu (ACB) - CN Gò Mây - TP.HCM',
    'Hợp đồng nguyên tắc bảo dưỡng, sửa chữa xe vận tải và thiết bị môi trường',
    'active'
) ON CONFLICT (tax_code) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    contact_person = EXCLUDED.contact_person;

-- 2. CÔNG TY 2: CÔNG TY TNHH GIẢI PHÁP TVXD KHÔNG GIAN XANH
INSERT INTO public.companies (
    id,
    name,
    tax_code,
    address,
    contact_person,
    contact_email,
    contact_phone,
    bank_account,
    bank_name,
    notes,
    status
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'CÔNG TY TNHH GIẢI PHÁP TVXD KHÔNG GIAN XANH',
    '0313505841',
    'Số 214A, đường số 5, KP3, phường Bình Hưng Hòa, TP.HCM, Việt Nam',
    'Ông Nguyễn Mạnh Cường (Giám đốc)',
    'khonggianxanh.tvxd@gmail.com',
    '028.3750.2125',
    '206426269',
    'Ngân hàng TMCP Á Châu (ACB) - PGD Gò Mây - TP.HCM',
    'Bên B (Thuê dịch vụ): Hợp đồng tư vấn xây dựng và cung cấp phụ tùng, vật tư',
    'active'
) ON CONFLICT (tax_code) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    contact_person = EXCLUDED.contact_person,
    contact_phone = EXCLUDED.contact_phone,
    bank_account = EXCLUDED.bank_account,
    bank_name = EXCLUDED.bank_name;
    name = EXCLUDED.name,
    address = EXCLUDED.address;

-- 3. HỢP ĐỒNG NGUYÊN TẮC VỚI CÔNG TY MÔI TRƯỜNG XANH
INSERT INTO public.contracts (
    id,
    company_id,
    contract_number,
    contract_name,
    signed_date,
    effective_date,
    payment_terms_days,
    penalty_rate_daily,
    penalty_base_type,
    notes,
    status
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '108/2026/HĐNT: MTX-TT',
    'Hợp đồng nguyên tắc sửa chữa, bảo dưỡng xe và cung cấp phụ tùng',
    '2026-08-01',
    '2026-08-01',
    90,
    0.001,
    'overdue_principal',
    'Điều khoản thanh toán: 90 ngày kể từ ngày Bên B nhận đủ hóa đơn điện tử hợp lệ và biên bản nghiệm thu. Phạt 0,1%/ngày chậm thanh toán.',
    'active'
) ON CONFLICT (company_id, contract_number) DO NOTHING;

-- 4. BẢNG HÓA ĐƠN: ĐỂ TRỐNG ĐỂ BẠN TỰ NHẬP HÓA ĐƠN THỰC TẾ
-- (Đã xóa toàn bộ dữ liệu mẫu theo yêu cầu của bạn)

-- 5. CẤU HÌNH HỆ THỐNG MẶC ĐỊNH
INSERT INTO public.app_settings (
    owner_name,
    owner_email,
    owner_phone,
    send_daily_digest_email,
    daily_digest_time,
    timezone,
    reminder_days_before,
    reminder_days_overdue,
    recurring_overdue_interval_days
) VALUES (
    'HỘ KINH DOANH TRẦN THẢO TRANG',
    'hieptrang25102025@gmail.com',
    '0387023068',
    false, -- Mặc định tắt, bạn có thể bật trong cài đặt sau khi cấu hình API key
    '09:00',
    'Asia/Ho_Chi_Minh',
    '[15, 7, 3]',
    '[1, 7, 15, 30, 60, 90]',
    7
) ON CONFLICT DO NOTHING;
