export type DebtStatus =
  | "incomplete_dossier"      // Thiếu hồ sơ
  | "pending_confirmation"   // Chờ xác nhận mốc tính hạn
  | "not_due_yet"            // Chưa đến hạn
  | "upcoming_due"           // Sắp đến hạn (còn <= 15 ngày)
  | "due_today"              // Đến hạn hôm nay
  | "overdue"                // Quá hạn
  | "partially_paid"         // Đã thanh toán một phần
  | "fully_paid"             // Đã thanh toán
  | "reconciling"            // Đang đối chiếu
  | "disputed"               // Đang tranh chấp
  | "extended"               // Được gia hạn
  | "paused";                // Tạm dừng xử lý

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export type NotificationType =
  | "incomplete_dossier"
  | "upcoming_15d"
  | "upcoming_7d"
  | "upcoming_3d"
  | "due_today"
  | "overdue_1d"
  | "overdue_7d"
  | "overdue_15d"
  | "overdue_30d"
  | "overdue_60d"
  | "overdue_90d"
  | "overdue_recurring_7d"
  | "promised_payment_due"
  | "dispute_alert";

export type ContactChannel = "call" | "zalo" | "email_manual" | "meeting" | "other";

export type ContactResult =
  | "not_contacted"
  | "called"
  | "zalo_sent"
  | "email_sent"
  | "promised_payment"
  | "requested_reconciliation"
  | "requested_postponement"
  | "in_dispute"
  | "resolved"
  | "paused"
  | "no_answer"
  | "other";

export interface Company {
  id: string;
  name: string;
  tax_code: string;
  address: string;
  contact_person: string;
  contact_email: string; // CHỈ lưu để tra cứu, KHÔNG tự gửi email nhắc nợ
  contact_phone: string;
  bank_account?: string;
  bank_name?: string;
  notes?: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  company_id: string;
  company_name?: string;
  contract_number: string;
  contract_name: string;
  signed_date: string;
  effective_date: string;
  payment_terms_days: number; // Mặc định 90 ngày
  penalty_rate_daily: number; // Mặc định 0.001 (0.1%/ngày)
  penalty_base_type: "overdue_principal" | "custom";
  contract_file_url?: string;
  notes?: string;
  status: "active" | "completed" | "terminated";
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  company_name?: string;
  contract_id: string;
  contract_number?: string;
  invoice_number: string;
  invoice_serial?: string;
  invoice_date: string;              // Ngày xuất hóa đơn
  acceptance_date?: string;          // Ngày nghiệm thu
  sent_invoice_date?: string;        // Ngày gửi HĐĐT
  sent_acceptance_date?: string;     // Ngày gửi BBNT
  confirmed_receipt_date?: string;   // Ngày Bên B xác nhận nhận đủ hồ sơ
  confirmed_start_date?: string;     // Ngày bắt đầu tính hạn đã được xác nhận
  due_date?: string;                 // Hạn thanh toán (confirmed_start_date + 90 ngày)
  extended_due_date?: string;        // Hạn gia hạn (nếu có)
  extension_reason?: string;
  extension_proof_url?: string;
  total_amount: number;              // Giá trị hóa đơn (VNĐ)
  paid_amount: number;               // Đã thanh toán (VNĐ)
  remaining_balance: number;         // Số dư còn phải thu (VNĐ)
  estimated_penalty: number;         // Tiền phạt chậm trả tạm tính (VNĐ)
  days_overdue: number;              // Số ngày quá hạn
  invoice_file_url?: string;
  acceptance_file_url?: string;
  notes?: string;
  status: DebtStatus;
  dispute_reason?: string;
  is_paused: boolean;
  pause_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  company_id?: string;
  payment_date: string;
  amount: number;
  payment_method: "bank_transfer" | "cash" | "other";
  transaction_ref?: string;
  proof_file_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactHistory {
  id: string;
  invoice_id: string;
  company_id: string;
  company_name?: string;
  invoice_number?: string;
  contact_date: string;
  channel: ContactChannel;
  contact_person: string;
  content: string;
  result: ContactResult;
  promised_date?: string;
  next_step_notes?: string;
  created_at: string;
}

export interface PaymentPromise {
  id: string;
  invoice_id: string;
  company_id: string;
  company_name?: string;
  invoice_number?: string;
  promised_date: string;
  promised_amount?: number;
  contact_history_id?: string;
  status: "pending" | "fulfilled" | "broken" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  invoice_id?: string;
  company_id?: string;
  company_name?: string;
  invoice_number?: string;
  contract_number?: string;
  notification_type: NotificationType;
  milestone_date: string;
  dedup_key: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  suggested_action: string;
  remaining_balance?: number;
  estimated_penalty?: number;
  days_overdue?: number;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_notes?: string;
  created_at: string;
}

export interface AppSettings {
  id?: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  send_daily_digest_email: boolean;
  daily_digest_time: string; // "09:00"
  timezone: string;          // "Asia/Ho_Chi_Minh"
  reminder_days_before: number[];  // [15, 7, 3]
  reminder_days_overdue: number[]; // [1, 7, 15, 30, 60, 90]
  recurring_overdue_interval_days: number; // 7
  resend_api_key?: string;
  email_from?: string;
  updated_at?: string;
}

export interface ScheduledJobRun {
  id: string;
  job_name: string;
  run_at: string;
  status: "success" | "failed" | "warning";
  processed_invoices_count: number;
  notifications_created_count: number;
  error_details?: string;
  execution_duration_ms: number;
  created_at: string;
}

export interface EmailNotificationLog {
  id: string;
  recipient_email: string;
  subject: string;
  digest_summary: any;
  status: "sent" | "failed" | "skipped";
  error_message?: string;
  sent_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data?: any;
  new_data?: any;
  changed_by?: string;
  reason?: string;
  created_at: string;
}
