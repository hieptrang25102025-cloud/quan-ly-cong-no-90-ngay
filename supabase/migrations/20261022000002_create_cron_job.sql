-- ====================================================================
-- TỰ ĐỘNG HÓA TÁC VỤ KIỂM TRA CÔNG NỢ VÀ TẠO THÔNG BÁO TẠI 09:00 SÁNG
-- Múi giờ: Asia/Ho_Chi_Minh (09:00 VN = 02:00 UTC)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.fn_run_daily_debt_check()
RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMPTZ := CLOCK_TIMESTAMP();
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
    v_inv RECORD;
    v_promise RECORD;
    v_processed_count INTEGER := 0;
    v_created_count INTEGER := 0;
    v_effective_due DATE;
    v_days_overdue INTEGER;
    v_days_remaining INTEGER;
    v_remaining NUMERIC(15, 2);
    v_penalty NUMERIC(15, 2);
    v_dedup_key VARCHAR(255);
    v_duration_ms INTEGER;
BEGIN
    -- 1. LẶP QUA TẤT CẢ CÁC HÓA ĐƠN CHƯA THANH TOÁN XONG VÀ KHÔNG BỊ TẠM DỪNG
    FOR v_inv IN 
        SELECT i.*, c.name AS company_name, k.contract_number
        FROM public.invoices i
        JOIN public.companies c ON i.company_id = c.id
        LEFT JOIN public.contracts k ON i.contract_id = k.id
        WHERE i.remaining_balance > 0 AND i.is_paused = FALSE
    LOOP
        v_processed_count := v_processed_count + 1;

        -- A. Kiểm tra nếu thiếu ngày bắt đầu tính hạn
        IF v_inv.confirmed_start_date IS NULL THEN
            v_dedup_key := v_inv.id || ':incomplete_dossier:' || v_inv.invoice_date;
            INSERT INTO public.notifications (
                invoice_id, company_id, notification_type, milestone_date,
                dedup_key, title, message, priority, suggested_action,
                remaining_balance, estimated_penalty, days_overdue
            ) VALUES (
                v_inv.id, v_inv.company_id, 'incomplete_dossier', v_today,
                v_dedup_key,
                'Hồ sơ hóa đơn ' || v_inv.invoice_number || ' chưa có mốc tính hạn',
                'Hóa đơn số ' || v_inv.invoice_number || ' của ' || v_inv.company_name || ' chưa có ngày Bên B nhận đủ hồ sơ để tính hạn 90 ngày.',
                'medium',
                'Kiểm tra chứng từ giao nhận và cập nhật ngày bắt đầu tính hạn',
                v_inv.remaining_balance, 0, 0
            ) ON CONFLICT (dedup_key) DO NOTHING;
            IF FOUND THEN v_created_count := v_created_count + 1; END IF;
            CONTINUE;
        END IF;

        v_effective_due := COALESCE(v_inv.extended_due_date, v_inv.due_date);
        IF v_effective_due IS NULL THEN CONTINUE; END IF;

        v_days_remaining := v_effective_due - v_today;
        v_days_overdue := GREATEST(0, v_today - v_effective_due);
        v_remaining := v_inv.remaining_balance;
        v_penalty := ROUND(v_remaining * 0.001 * v_days_overdue);

        -- Cập nhật số ngày quá hạn và tiền phạt tạm tính vào hóa đơn
        UPDATE public.invoices
        SET days_overdue = v_days_overdue,
            estimated_penalty = v_penalty,
            status = CASE 
                WHEN v_days_overdue > 0 THEN 'overdue'::debt_status_enum
                WHEN v_days_remaining = 0 THEN 'due_today'::debt_status_enum
                WHEN v_days_remaining <= 15 THEN 'upcoming_due'::debt_status_enum
                ELSE 'not_due_yet'::debt_status_enum
            END,
            updated_at = TIMEZONE('Asia/Ho_Chi_Minh', NOW())
        WHERE id = v_inv.id;

        -- B. Cảnh báo trước hạn 15 ngày
        IF v_days_remaining = 15 THEN
            v_dedup_key := v_inv.id || ':upcoming_15d:' || v_effective_due;
            INSERT INTO public.notifications (
                invoice_id, company_id, notification_type, milestone_date,
                dedup_key, title, message, priority, suggested_action,
                remaining_balance, estimated_penalty, days_overdue
            ) VALUES (
                v_inv.id, v_inv.company_id, 'upcoming_15d', v_today,
                v_dedup_key,
                'Công nợ ' || v_inv.invoice_number || ' còn 15 ngày đến hạn',
                v_inv.company_name || ' còn nợ ' || to_char(v_remaining, 'FM999,999,999,999') || ' VNĐ (HĐ ' || v_inv.invoice_number || '), hạn thanh toán: ' || to_char(v_effective_due, 'DD/MM/YYYY'),
                'medium',
                'Kiểm tra tiến độ xếp lịch thanh toán với phòng kế toán khách hàng',
                v_remaining, 0, 0
            ) ON CONFLICT (dedup_key) DO NOTHING;
            IF FOUND THEN v_created_count := v_created_count + 1; END IF;
        END IF;

        -- C. Cảnh báo trước hạn 7 ngày
        IF v_days_remaining = 7 THEN
            v_dedup_key := v_inv.id || ':upcoming_7d:' || v_effective_due;
            INSERT INTO public.notifications (
                invoice_id, company_id, notification_type, milestone_date,
                dedup_key, title, message, priority, suggested_action,
                remaining_balance, estimated_penalty, days_overdue
            ) VALUES (
                v_inv.id, v_inv.company_id, 'upcoming_7d', v_today,
                v_dedup_key,
                'Công nợ ' || v_inv.invoice_number || ' còn 7 ngày đến hạn',
                v_inv.company_name || ' còn nợ ' || to_char(v_remaining, 'FM999,999,999,999') || ' VNĐ (HĐ ' || v_inv.invoice_number || '), sắp đến hạn trong tuần này',
                'high',
                'Nhắn tin hoặc gọi điện nhắc nhẹ lịch thanh toán',
                v_remaining, 0, 0
            ) ON CONFLICT (dedup_key) DO NOTHING;
            IF FOUND THEN v_created_count := v_created_count + 1; END IF;
        END IF;

        -- D. Cảnh báo trước hạn 3 ngày
        IF v_days_remaining = 3 THEN
            v_dedup_key := v_inv.id || ':upcoming_3d:' || v_effective_due;
            INSERT INTO public.notifications (
                invoice_id, company_id, notification_type, milestone_date,
                dedup_key, title, message, priority, suggested_action,
                remaining_balance, estimated_penalty, days_overdue
            ) VALUES (
                v_inv.id, v_inv.company_id, 'upcoming_3d', v_today,
                v_dedup_key,
                'Công nợ ' || v_inv.invoice_number || ' còn 3 ngày đến hạn',
                v_inv.company_name || ' còn nợ ' || to_char(v_remaining, 'FM999,999,999,999') || ' VNĐ (HĐ ' || v_inv.invoice_number || '), chỉ còn 3 ngày đến hạn',
                'high',
                'Liên hệ trực tiếp phụ trách thanh toán',
                v_remaining, 0, 0
            ) ON CONFLICT (dedup_key) DO NOTHING;
            IF FOUND THEN v_created_count := v_created_count + 1; END IF;
        END IF;

        -- E. Đúng ngày đến hạn (0 ngày)
        IF v_days_remaining = 0 THEN
            v_dedup_key := v_inv.id || ':due_today:' || v_effective_due;
            INSERT INTO public.notifications (
                invoice_id, company_id, notification_type, milestone_date,
                dedup_key, title, message, priority, suggested_action,
                remaining_balance, estimated_penalty, days_overdue
            ) VALUES (
                v_inv.id, v_inv.company_id, 'due_today', v_today,
                v_dedup_key,
                'Khoản nợ ' || v_inv.invoice_number || ' ĐẾN HẠN HÔM NAY',
                v_inv.company_name || ' đến hạn thanh toán khoản nợ ' || to_char(v_remaining, 'FM999,999,999,999') || ' VNĐ hôm nay (' || to_char(v_effective_due, 'DD/MM/YYYY') || ')',
                'high',
                'Kiểm tra tài khoản ngân hàng và liên hệ nếu chưa nhận được tiền',
                v_remaining, 0, 0
            ) ON CONFLICT (dedup_key) DO NOTHING;
            IF FOUND THEN v_created_count := v_created_count + 1; END IF;
        END IF;

        -- F. Quá hạn các mốc: 1, 7, 15, 30, 60, 90 ngày
        IF v_days_overdue IN (1, 7, 15, 30, 60, 90) THEN
            v_dedup_key := v_inv.id || ':overdue_' || v_days_overdue || 'd:' || v_effective_due || '_d' || v_days_overdue;
            INSERT INTO public.notifications (
                invoice_id, company_id, notification_type, milestone_date,
                dedup_key, title, message,
                priority,
                suggested_action,
                remaining_balance, estimated_penalty, days_overdue
            ) VALUES (
                v_inv.id, v_inv.company_id, 'overdue_' || v_days_overdue || 'd', v_today,
                v_dedup_key,
                'Công nợ ' || v_inv.invoice_number || ' đã QUÁ HẠN ' || v_days_overdue || ' ngày',
                v_inv.company_name || ' còn nợ ' || to_char(v_remaining, 'FM999,999,999,999') || ' VNĐ (quá hạn ' || v_days_overdue || ' ngày). Tiền phạt tạm tính: ' || to_char(v_penalty, 'FM999,999,999,999') || ' VNĐ (0,1%/ngày).',
                CASE WHEN v_days_overdue >= 30 THEN 'urgent'::notification_priority_enum ELSE 'high'::notification_priority_enum END,
                CASE WHEN v_days_overdue >= 30 THEN 'Làm việc trực tiếp lãnh đạo Bên B hoặc gửi công văn đôn đốc công nợ' ELSE 'Gọi điện cho kế toán trưởng đôn đốc thanh toán' END,
                v_remaining, v_penalty, v_days_overdue
            ) ON CONFLICT (dedup_key) DO NOTHING;
            IF FOUND THEN v_created_count := v_created_count + 1; END IF;
        END IF;

        -- G. Quá hạn sau 30 ngày: nhắc định kỳ mỗi 7 ngày
        IF v_days_overdue > 30 AND (v_days_overdue - 30) % 7 = 0 AND v_days_overdue NOT IN (60, 90) THEN
            v_dedup_key := v_inv.id || ':overdue_recurring_7d:' || v_effective_due || '_d' || v_days_overdue;
            INSERT INTO public.notifications (
                invoice_id, company_id, notification_type, milestone_date,
                dedup_key, title, message, priority, suggested_action,
                remaining_balance, estimated_penalty, days_overdue
            ) VALUES (
                v_inv.id, v_inv.company_id, 'overdue_recurring_7d', v_today,
                v_dedup_key,
                'Nhắc định kỳ: Hóa đơn ' || v_inv.invoice_number || ' quá hạn ' || v_days_overdue || ' ngày',
                v_inv.company_name || ' nợ quá hạn ' || v_days_overdue || ' ngày, dư nợ ' || to_char(v_remaining, 'FM999,999,999,999') || ' VNĐ. Tiền phạt: ' || to_char(v_penalty, 'FM999,999,999,999') || ' VNĐ.',
                'urgent',
                'Đánh giá khả năng thu hồi, yêu cầu cam kết tiến độ thanh toán bằng văn bản',
                v_remaining, v_penalty, v_days_overdue
            ) ON CONFLICT (dedup_key) DO NOTHING;
            IF FOUND THEN v_created_count := v_created_count + 1; END IF;
        END IF;

    END LOOP;

    -- 2. KIỂM TRA CÁC LỊCH HẸN THANH TOÁN (PAYMENT PROMISES) HÔM NAY
    FOR v_promise IN
        SELECT p.*, c.name AS company_name, i.invoice_number
        FROM public.payment_promises p
        JOIN public.companies c ON p.company_id = c.id
        LEFT JOIN public.invoices i ON p.invoice_id = i.id
        WHERE p.status = 'pending' AND p.promised_date = v_today
    LOOP
        v_dedup_key := v_promise.invoice_id || ':promised_payment_due:' || v_today;
        INSERT INTO public.notifications (
            invoice_id, company_id, notification_type, milestone_date,
            dedup_key, title, message, priority, suggested_action,
            remaining_balance, estimated_penalty, days_overdue
        ) VALUES (
            v_promise.invoice_id, v_promise.company_id, 'promised_payment_due', v_today,
            v_dedup_key,
            'HÔM NAY: Đến ngày ' || v_promise.company_name || ' hẹn thanh toán',
            v_promise.company_name || ' đã cam kết thanh toán hôm nay (' || to_char(v_today, 'DD/MM/YYYY') || ') cho HĐ ' || COALESCE(v_promise.invoice_number, '') || '. Số tiền hẹn: ' || COALESCE(to_char(v_promise.promised_amount, 'FM999,999,999,999') || ' VNĐ', 'toàn bộ nợ'),
            'urgent',
            'Kiểm tra sao kê ngân hàng ngay và liên hệ đôn đốc nếu chưa nhận được tiền',
            COALESCE(v_promise.promised_amount, 0), 0, 0
        ) ON CONFLICT (dedup_key) DO NOTHING;
        IF FOUND THEN v_created_count := v_created_count + 1; END IF;
    END LOOP;

    v_duration_ms := EXTRACT(MILLISECONDS FROM (CLOCK_TIMESTAMP() - v_start_time))::INTEGER;

    -- Ghi nhật ký tác vụ thành công
    INSERT INTO public.scheduled_job_runs (
        job_name, run_at, status, processed_invoices_count, notifications_created_count, execution_duration_ms
    ) VALUES (
        'daily_debt_check_09am', TIMEZONE('Asia/Ho_Chi_Minh', NOW()), 'success', v_processed_count, v_created_count, v_duration_ms
    );

    RETURN jsonb_build_object(
        'success', true,
        'date', v_today,
        'processed_invoices', v_processed_count,
        'notifications_created', v_created_count,
        'duration_ms', v_duration_ms
    );
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.scheduled_job_runs (
        job_name, run_at, status, processed_invoices_count, notifications_created_count, error_details
    ) VALUES (
        'daily_debt_check_09am', TIMEZONE('Asia/Ho_Chi_Minh', NOW()), 'failed', v_processed_count, v_created_count, SQLERRM
    );
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BẬT PG_CRON ĐỂ CHẠY LÚC 09:00 SÁNG GIỜ VIỆT NAM (02:00 UTC)
-- Để kích hoạt trong Supabase SQL Editor:
-- SELECT cron.schedule('daily-debt-check-09am', '0 2 * * *', 'SELECT public.fn_run_daily_debt_check()');
