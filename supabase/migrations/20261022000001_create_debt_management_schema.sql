-- ====================================================================
-- HỆ THỐNG QUẢN LÝ CÔNG NỢ 90 NGÀY - SUPABASE POSTGRESQL SCHEMA
-- Múi giờ: Asia/Ho_Chi_Minh
-- ====================================================================

-- 1. BẬT CÁC EXTENSION CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Cho tìm kiếm nhanh tên công ty, số hóa đơn

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE debt_status_enum AS ENUM (
        'incomplete_dossier',
        'pending_confirmation',
        'not_due_yet',
        'upcoming_due',
        'due_today',
        'overdue',
        'partially_paid',
        'fully_paid',
        'reconciling',
        'disputed',
        'extended',
        'paused'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE contact_channel_enum AS ENUM ('call', 'zalo', 'email_manual', 'meeting', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. BẢNG CÔNG TY KHÁCH HÀNG (companies)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    contact_person VARCHAR(100),
    contact_email VARCHAR(150), -- CHỈ lưu liên hệ, TUYỆT ĐỐI KHÔNG gửi mail nhắc nợ tự động
    contact_phone VARCHAR(50),
    bank_account VARCHAR(50),
    bank_name VARCHAR(150),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 4. BẢNG HỢP ĐỒNG (contracts)
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    contract_number VARCHAR(100) NOT NULL,
    contract_name VARCHAR(255) NOT NULL,
    signed_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    payment_terms_days INTEGER NOT NULL DEFAULT 90 CHECK (payment_terms_days > 0),
    penalty_rate_daily NUMERIC(6, 5) NOT NULL DEFAULT 0.001 CHECK (penalty_rate_daily >= 0), -- 0.1%/ngày
    penalty_base_type VARCHAR(50) NOT NULL DEFAULT 'overdue_principal',
    contract_file_url TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    CONSTRAINT uq_contract_number_company UNIQUE(company_id, contract_number)
);

-- 5. BẢNG HÓA ĐƠN VÀ CÔNG NỢ (invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_serial VARCHAR(20), -- Ký hiệu: ví dụ 2C26MAA
    invoice_date DATE NOT NULL,
    acceptance_date DATE,
    sent_invoice_date DATE,
    sent_acceptance_date DATE,
    confirmed_receipt_date DATE, -- Ngày Bên B xác nhận nhận đủ hồ sơ
    confirmed_start_date DATE,   -- Ngày bắt đầu tính hạn đã xác nhận (căn cứ cộng 90 ngày)
    due_date DATE,               -- Hạn thanh toán mặc định = confirmed_start_date + payment_terms_days
    extended_due_date DATE,      -- Hạn mới khi được gia hạn
    extension_reason TEXT,
    extension_proof_url TEXT,
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    estimated_penalty NUMERIC(15, 2) NOT NULL DEFAULT 0,
    days_overdue INTEGER NOT NULL DEFAULT 0,
    invoice_file_url TEXT,
    acceptance_file_url TEXT,
    notes TEXT,
    status debt_status_enum NOT NULL DEFAULT 'pending_confirmation',
    dispute_reason TEXT,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    pause_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    CONSTRAINT uq_invoice_company UNIQUE(company_id, invoice_number)
);

-- 6. BẢNG FILE TÀI LIỆU ĐÍNH KÈM (invoice_documents)
CREATE TABLE IF NOT EXISTS public.invoice_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('invoice_pdf', 'acceptance_pdf', 'delivery_receipt', 'payment_proof', 'dispute_doc', 'other')),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 7. BẢNG LỊCH SỬ THANH TOÁN (payments)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'cash', 'other')),
    transaction_ref VARCHAR(100),
    proof_file_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 8. BẢNG PHÂN BỔ THANH TOÁN (payment_allocations)
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    allocated_principal NUMERIC(15, 2) NOT NULL CHECK (allocated_principal >= 0),
    allocated_penalty NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (allocated_penalty >= 0),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 9. BẢNG LỊCH SỬ LIÊN HỆ KHÁCH HÀNG (contact_histories)
CREATE TABLE IF NOT EXISTS public.contact_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contact_date TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    channel contact_channel_enum NOT NULL DEFAULT 'call',
    contact_person VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    result VARCHAR(50) NOT NULL,
    promised_date DATE,
    next_step_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 10. BẢNG HẸN THANH TOÁN (payment_promises)
CREATE TABLE IF NOT EXISTS public.payment_promises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contact_history_id UUID REFERENCES public.contact_histories(id) ON DELETE SET NULL,
    promised_date DATE NOT NULL,
    promised_amount NUMERIC(15, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'broken', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 11. BẢNG TRUNG TÂM THÔNG BÁO (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    milestone_date DATE NOT NULL,
    dedup_key VARCHAR(255) NOT NULL UNIQUE, -- KHÓA CHỐNG TRÙNG TUYỆT ĐỐI
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority notification_priority_enum NOT NULL DEFAULT 'medium',
    suggested_action TEXT,
    remaining_balance NUMERIC(15, 2) DEFAULT 0,
    estimated_penalty NUMERIC(15, 2) DEFAULT 0,
    days_overdue INTEGER DEFAULT 0,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 12. BẢNG NHẬT KÝ TÁC VỤ ĐỊNH KỲ (scheduled_job_runs)
CREATE TABLE IF NOT EXISTS public.scheduled_job_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL,
    run_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'warning')),
    processed_invoices_count INTEGER NOT NULL DEFAULT 0,
    notifications_created_count INTEGER NOT NULL DEFAULT 0,
    error_details TEXT,
    execution_duration_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 13. BẢNG NHẬT KÝ EMAIL TỔNG HỢP (email_notification_logs)
CREATE TABLE IF NOT EXISTS public.email_notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    digest_summary JSONB,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 14. BẢNG CẤU HÌNH HỆ THỐNG (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    owner_name VARCHAR(150) NOT NULL DEFAULT 'Trần Thảo Trang',
    owner_email VARCHAR(150) NOT NULL DEFAULT 'hieptrang25102025@gmail.com',
    owner_phone VARCHAR(50) DEFAULT '0387023068',
    send_daily_digest_email BOOLEAN NOT NULL DEFAULT FALSE, -- Mặc định tắt cho tới khi cấu hình
    daily_digest_time VARCHAR(10) NOT NULL DEFAULT '09:00',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    reminder_days_before JSONB NOT NULL DEFAULT '[15, 7, 3]',
    reminder_days_overdue JSONB NOT NULL DEFAULT '[1, 7, 15, 30, 60, 90]',
    recurring_overdue_interval_days INTEGER NOT NULL DEFAULT 7,
    resend_api_key TEXT,
    email_from VARCHAR(150) DEFAULT 'He Thong Cong No <onboarding@resend.dev>',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- 15. BẢNG NHẬT KÝ THAY ĐỔI (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(100),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW())
);

-- ====================================================================
-- TẠO CÁC INDEX TỐI ƯU HIỆU NĂNG TRUY VẤN
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON public.invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_notifications_dedup_key ON public.notifications(dedup_key);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_resolved ON public.notifications(is_resolved);
CREATE INDEX IF NOT EXISTS idx_payment_promises_status ON public.payment_promises(status, promised_date);
CREATE INDEX IF NOT EXISTS idx_contact_histories_invoice ON public.contact_histories(invoice_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & CHÍNH SÁCH BẢO MẬT
-- ====================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Chính sách: Người dùng chỉ đọc và ghi dữ liệu của chính mình
CREATE POLICY "Cho phép người dùng đã xác thực quản lý companies"
    ON public.companies FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Cho phép người dùng đã xác thực quản lý contracts"
    ON public.contracts FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Cho phép người dùng đã xác thực quản lý invoices"
    ON public.invoices FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Cho phép người dùng đã xác thực quản lý payments"
    ON public.payments FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Cho phép người dùng đã xác thực quản lý contact_histories"
    ON public.contact_histories FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Cho phép người dùng đã xác thực quản lý payment_promises"
    ON public.payment_promises FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Cho phép người dùng đã xác thực quản lý notifications"
    ON public.notifications FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Cho phép người dùng đã xác thực quản lý app_settings"
    ON public.app_settings FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Cho phép người dùng đã xác thực xem scheduled_job_runs"
    ON public.scheduled_job_runs FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Cho phép người dùng đã xác thực xem email_notification_logs"
    ON public.email_notification_logs FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Cho phép service_role (các tác vụ tự động trên server) toàn quyền truy cập
CREATE POLICY "Service role full access companies" ON public.companies FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access contracts" ON public.contracts FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access invoices" ON public.invoices FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access payments" ON public.payments FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access notifications" ON public.notifications FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access scheduled_job_runs" ON public.scheduled_job_runs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access app_settings" ON public.app_settings FOR ALL TO service_role USING (true);

-- ====================================================================
-- HÀM TRIGGER TỰ ĐỘNG CẬP NHẬT TIỀN PHẠT VÀ SỐ DƯ KHI GHI NHẬN THANH TOÁN
-- ====================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_invoice_after_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC(15, 2);
    v_total_amount NUMERIC(15, 2);
    v_new_remaining NUMERIC(15, 2);
    v_due_date DATE;
    v_days_overdue INTEGER := 0;
    v_penalty NUMERIC(15, 2) := 0;
    v_status debt_status_enum;
BEGIN
    -- Tính tổng tiền đã thanh toán cho hóa đơn này
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id;

    -- Lấy thông tin hóa đơn
    SELECT total_amount, COALESCE(extended_due_date, due_date)
    INTO v_total_amount, v_due_date
    FROM public.invoices
    WHERE id = NEW.invoice_id;

    v_new_remaining := GREATEST(0, v_total_amount - v_total_paid);

    IF v_due_date IS NOT NULL AND CURRENT_DATE > v_due_date THEN
        v_days_overdue := CURRENT_DATE - v_due_date;
        -- Phạt 0.1%/ngày trên số dư nợ còn lại
        v_penalty := ROUND(v_new_remaining * 0.001 * v_days_overdue);
    END IF;

    IF v_new_remaining = 0 THEN
        v_status := 'fully_paid';
    ELSIF v_total_paid > 0 THEN
        IF v_days_overdue > 0 THEN
            v_status := 'overdue';
        ELSE
            v_status := 'partially_paid';
        END IF;
    ELSE
        IF v_days_overdue > 0 THEN
            v_status := 'overdue';
        ELSE
            v_status := 'not_due_yet';
        END IF;
    END IF;

    -- Cập nhật vào bảng invoices
    UPDATE public.invoices
    SET paid_amount = v_total_paid,
        remaining_balance = v_new_remaining,
        days_overdue = v_days_overdue,
        estimated_penalty = v_penalty,
        status = v_status,
        updated_at = TIMEZONE('Asia/Ho_Chi_Minh', NOW())
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_invoice_after_payment ON public.payments;
CREATE TRIGGER trg_sync_invoice_after_payment
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_invoice_after_payment();
