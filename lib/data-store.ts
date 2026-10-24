import { Company, Contract, Invoice, Payment, ContactHistory, PaymentPromise, NotificationItem, AppSettings } from "@/types/debt";
import { calculateDueDate, calculateDaysOverdue, calculateEstimatedPenalty, determineDebtStatus } from "./debt-engine";

// Dữ liệu mẫu thực tế từ hồ sơ của bạn
export const INITIAL_COMPANIES: Company[] = [
  {
    id: "comp-1",
    name: "CÔNG TY TNHH XÂY DỰNG MÔI TRƯỜNG XANH",
    tax_code: "0304599836",
    address: "Số 214 đường số 5, Khu Phố 3, Phường Bình Hưng Hòa, TP Hồ Chí Minh, Việt Nam",
    contact_person: "TRẦN ANH TUẤN (Giám đốc)",
    contact_email: "ketoan.moitruongxanh@gmail.com",
    contact_phone: "0908123456",
    bank_account: "130993789",
    bank_name: "Ngân hàng Á Châu (ACB) - CN Gò Mây - TP.HCM",
    notes: "Khách hàng hợp đồng sửa chữa, bảo dưỡng xe tải và xe môi trường",
    status: "active",
    created_at: "2026-08-01T08:00:00+07:00",
    updated_at: "2026-10-22T09:00:00+07:00",
  },
  {
    id: "comp-2",
    name: "CÔNG TY TNHH GIẢI PHÁP TVXD KHÔNG GIAN XANH",
    tax_code: "0313505841",
    address: "Số 214A, đường số 5, KP3, phường Bình Hưng Hòa, TP.HCM, Việt Nam",
    contact_person: "Ông Nguyễn Mạnh Cường (Giám đốc)",
    contact_email: "khonggianxanh.tvxd@gmail.com",
    contact_phone: "028.3750.2125",
    bank_account: "206426269",
    bank_name: "Ngân hàng TMCP Á Châu (ACB) - PGD Gò Mây - TP.HCM",
    notes: "Khách hàng hợp đồng tư vấn xây dựng và cung cấp phụ tùng thiết bị",
    status: "active",
    created_at: "2026-09-01T08:00:00+07:00",
    updated_at: "2026-10-22T09:00:00+07:00",
  },
];

export const INITIAL_CONTRACTS: Contract[] = [
  {
    id: "con-1",
    company_id: "comp-1",
    company_name: "CÔNG TY TNHH XÂY DỰNG MÔI TRƯỜNG XANH",
    contract_number: "108/2026/HĐNT: MTX-TT",
    contract_name: "Hợp đồng nguyên tắc sửa chữa xe và phụ tùng 2026",
    signed_date: "2026-08-01",
    effective_date: "2026-08-01",
    payment_terms_days: 90,
    penalty_rate_daily: 0.001,
    penalty_base_type: "overdue_principal",
    notes: "Thanh toán trong vòng 90 ngày sau khi Bên A cung cấp HĐĐT và BBNT. Phạt 0,1%/ngày chậm thanh toán trên tiền gốc chậm trả.",
    status: "active",
    created_at: "2026-08-01T08:30:00+07:00",
    updated_at: "2026-08-01T08:30:00+07:00",
  },
];

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_CONTACTS: ContactHistory[] = [];

export const INITIAL_PROMISES: PaymentPromise[] = [];

export const INITIAL_SETTINGS: AppSettings = {
  owner_name: "HỘ KINH DOANH TRẦN THẢO TRANG",
  owner_email: "hieptrang25102025@gmail.com",
  owner_phone: "0387023068",
  send_daily_digest_email: false,
  daily_digest_time: "09:00",
  timezone: "Asia/Ho_Chi_Minh",
  reminder_days_before: [15, 7, 3],
  reminder_days_overdue: [1, 7, 15, 30, 60, 90],
  recurring_overdue_interval_days: 7,
};


export const DEFAULT_SETTINGS = INITIAL_SETTINGS;