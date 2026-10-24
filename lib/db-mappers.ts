import {
  AppSettings,
  Company,
  ContactChannel,
  ContactHistory,
  ContactResult,
  Contract,
  DebtStatus,
  Invoice,
  Payment,
  PaymentPromise,
} from "@/types/debt";
import { DEFAULT_SETTINGS } from "./data-store";
import { calculateDueDate } from "./debt-engine";
import { recalcInvoice } from "./invoice-calc";

// ====================================================================
// Chuỗi select dùng chung (client + server) – kèm bảng liên kết để lấy tên
// ====================================================================
export const SELECT_COMPANIES = "*";
export const SELECT_CONTRACTS = "*, companies(name)";
export const SELECT_INVOICES = "*, companies(name), contracts(contract_number)";
export const SELECT_PAYMENTS = "*, invoices(company_id)";
export const SELECT_CONTACTS = "*, companies(name), invoices(invoice_number)";
export const SELECT_PROMISES = "*, companies(name), invoices(invoice_number)";
/** Cố ý KHÔNG lấy resend_api_key để khóa bí mật không bao giờ xuống trình duyệt. */
export const SELECT_SETTINGS =
  "id, owner_name, owner_email, owner_phone, send_daily_digest_email, daily_digest_time, timezone, reminder_days_before, reminder_days_overdue, recurring_overdue_interval_days, email_from, updated_at";

// ====================================================================
// Tiện ích chuẩn hóa
// ====================================================================
type Row = Record<string, any>;

/** "" / undefined / null  ->  null  (cột DATE, UUID… không nhận chuỗi rỗng). */
export function nullIfEmpty<T>(value: T | "" | null | undefined): T | null {
  if (value === "" || value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value as T;
}

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const optStr = (v: unknown): string | undefined =>
  v === null || v === undefined || v === "" ? undefined : String(v);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const trimmed = (v: unknown): string => str(v).trim();

// ====================================================================
// Công ty
// ====================================================================
export type CompanyInput = Pick<
  Company,
  | "name"
  | "tax_code"
  | "address"
  | "contact_person"
  | "contact_email"
  | "contact_phone"
  | "bank_account"
  | "bank_name"
  | "notes"
>;

export function toCompany(r: Row): Company {
  return {
    id: r.id,
    name: str(r.name),
    tax_code: str(r.tax_code),
    address: str(r.address),
    contact_person: str(r.contact_person),
    contact_email: str(r.contact_email),
    contact_phone: str(r.contact_phone),
    bank_account: optStr(r.bank_account),
    bank_name: optStr(r.bank_name),
    notes: optStr(r.notes),
    status: r.status === "inactive" ? "inactive" : "active",
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

export function companyToRow(c: CompanyInput): Row {
  return {
    name: trimmed(c.name),
    tax_code: trimmed(c.tax_code),
    address: nullIfEmpty(trimmed(c.address)),
    contact_person: nullIfEmpty(trimmed(c.contact_person)),
    contact_email: nullIfEmpty(trimmed(c.contact_email)),
    contact_phone: nullIfEmpty(trimmed(c.contact_phone)),
    bank_account: nullIfEmpty(trimmed(c.bank_account)),
    bank_name: nullIfEmpty(trimmed(c.bank_name)),
    notes: nullIfEmpty(trimmed(c.notes)),
  };
}

// ====================================================================
// Hợp đồng
// ====================================================================
export type ContractInput = Pick<
  Contract,
  | "company_id"
  | "contract_number"
  | "contract_name"
  | "signed_date"
  | "effective_date"
  | "payment_terms_days"
  | "penalty_rate_daily"
  | "notes"
>;

export function toContract(r: Row): Contract {
  return {
    id: r.id,
    company_id: r.company_id,
    company_name: optStr(r.companies?.name),
    contract_number: str(r.contract_number),
    contract_name: str(r.contract_name),
    signed_date: str(r.signed_date),
    effective_date: str(r.effective_date),
    payment_terms_days: num(r.payment_terms_days) || 90,
    penalty_rate_daily: num(r.penalty_rate_daily),
    penalty_base_type: r.penalty_base_type === "custom" ? "custom" : "overdue_principal",
    contract_file_url: optStr(r.contract_file_url),
    notes: optStr(r.notes),
    status: r.status === "completed" || r.status === "terminated" ? r.status : "active",
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

export function contractToRow(c: ContractInput): Row {
  return {
    company_id: c.company_id,
    contract_number: trimmed(c.contract_number),
    contract_name: trimmed(c.contract_name),
    signed_date: c.signed_date,
    effective_date: c.effective_date,
    payment_terms_days: Math.round(num(c.payment_terms_days)) || 90,
    penalty_rate_daily: num(c.penalty_rate_daily),
    notes: nullIfEmpty(trimmed(c.notes)),
  };
}

// ====================================================================
// Hóa đơn
// ====================================================================
export type NewInvoiceInput = Pick<
  Invoice,
  | "company_id"
  | "contract_id"
  | "invoice_number"
  | "invoice_serial"
  | "invoice_date"
  | "acceptance_date"
  | "sent_invoice_date"
  | "sent_acceptance_date"
  | "confirmed_receipt_date"
  | "confirmed_start_date"
  | "total_amount"
  | "invoice_file_url"
  | "acceptance_file_url"
  | "notes"
>;

/** Các cột được phép sửa trực tiếp sau khi tạo (gia hạn, tạm dừng, tranh chấp, ghi chú). */
export type InvoiceChanges = Partial<
  Pick<
    Invoice,
    | "extended_due_date"
    | "extension_reason"
    | "is_paused"
    | "pause_reason"
    | "dispute_reason"
    | "notes"
    | "invoice_file_url"
    | "acceptance_file_url"
  >
>;

export function toInvoice(r: Row): Invoice {
  return {
    id: r.id,
    company_id: r.company_id,
    company_name: optStr(r.companies?.name),
    contract_id: str(r.contract_id),
    contract_number: optStr(r.contracts?.contract_number),
    invoice_number: str(r.invoice_number),
    invoice_serial: optStr(r.invoice_serial),
    invoice_date: str(r.invoice_date),
    acceptance_date: optStr(r.acceptance_date),
    sent_invoice_date: optStr(r.sent_invoice_date),
    sent_acceptance_date: optStr(r.sent_acceptance_date),
    confirmed_receipt_date: optStr(r.confirmed_receipt_date),
    confirmed_start_date: optStr(r.confirmed_start_date),
    due_date: optStr(r.due_date),
    extended_due_date: optStr(r.extended_due_date),
    extension_reason: optStr(r.extension_reason),
    extension_proof_url: optStr(r.extension_proof_url),
    total_amount: num(r.total_amount),
    paid_amount: num(r.paid_amount),
    remaining_balance: num(r.remaining_balance),
    estimated_penalty: num(r.estimated_penalty),
    days_overdue: num(r.days_overdue),
    invoice_file_url: optStr(r.invoice_file_url),
    acceptance_file_url: optStr(r.acceptance_file_url),
    notes: optStr(r.notes),
    status: (r.status || "pending_confirmation") as DebtStatus,
    dispute_reason: optStr(r.dispute_reason),
    is_paused: Boolean(r.is_paused),
    pause_reason: optStr(r.pause_reason),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

/** Đọc hóa đơn từ DB rồi tính lại số ngày quá hạn/phạt/trạng thái theo ngày hôm nay. */
export function toFreshInvoice(r: Row, asOf: Date = new Date()): Invoice {
  return recalcInvoice(toInvoice(r), asOf);
}

/** Dựng hóa đơn mới (chưa có id) từ dữ liệu form, đã tính hạn 90 ngày và các trường dẫn xuất. */
export function buildNewInvoice(input: NewInvoiceInput, asOf: Date = new Date()): Invoice {
  const dueDate = input.confirmed_start_date ? calculateDueDate(input.confirmed_start_date, 90) : undefined;
  const draft: Invoice = {
    id: "",
    company_id: input.company_id,
    contract_id: input.contract_id || "",
    invoice_number: trimmed(input.invoice_number),
    invoice_serial: optStr(trimmed(input.invoice_serial)),
    invoice_date: input.invoice_date,
    acceptance_date: optStr(input.acceptance_date),
    sent_invoice_date: optStr(input.sent_invoice_date),
    sent_acceptance_date: optStr(input.sent_acceptance_date),
    confirmed_receipt_date: optStr(input.confirmed_receipt_date),
    confirmed_start_date: optStr(input.confirmed_start_date),
    due_date: dueDate,
    total_amount: num(input.total_amount),
    invoice_file_url: optStr(input.invoice_file_url),
    acceptance_file_url: optStr(input.acceptance_file_url),
    paid_amount: 0,
    remaining_balance: num(input.total_amount),
    estimated_penalty: 0,
    days_overdue: 0,
    notes: optStr(trimmed(input.notes)),
    status: "pending_confirmation",
    is_paused: false,
    created_at: "",
    updated_at: "",
  };
  return recalcInvoice(draft, asOf);
}

/** Cột INSERT cho hóa đơn mới. Chuỗi rỗng -> null để không làm hỏng cột DATE/UUID. */
export function invoiceToInsertRow(inv: Invoice): Row {
  return {
    company_id: inv.company_id,
    contract_id: nullIfEmpty(inv.contract_id),
    invoice_number: inv.invoice_number,
    invoice_serial: nullIfEmpty(inv.invoice_serial),
    invoice_date: inv.invoice_date,
    acceptance_date: nullIfEmpty(inv.acceptance_date),
    sent_invoice_date: nullIfEmpty(inv.sent_invoice_date),
    sent_acceptance_date: nullIfEmpty(inv.sent_acceptance_date),
    confirmed_receipt_date: nullIfEmpty(inv.confirmed_receipt_date),
    confirmed_start_date: nullIfEmpty(inv.confirmed_start_date),
    due_date: nullIfEmpty(inv.due_date),
    total_amount: inv.total_amount,
    paid_amount: inv.paid_amount,
    remaining_balance: inv.remaining_balance,
    estimated_penalty: inv.estimated_penalty,
    days_overdue: inv.days_overdue,
    invoice_file_url: nullIfEmpty(inv.invoice_file_url),
    acceptance_file_url: nullIfEmpty(inv.acceptance_file_url),
    notes: nullIfEmpty(inv.notes),
    status: inv.status,
    is_paused: inv.is_paused,
  };
}

/** Các cột dẫn xuất cần ghi lại sau mỗi thay đổi. */
export function invoiceDerivedPatch(inv: Invoice): Row {
  return {
    paid_amount: inv.paid_amount,
    remaining_balance: inv.remaining_balance,
    days_overdue: inv.days_overdue,
    estimated_penalty: inv.estimated_penalty,
    status: inv.status,
    updated_at: new Date().toISOString(),
  };
}

/** Chuyển các thay đổi trực tiếp (gia hạn/tạm dừng/…) thành cột DB. */
export function invoiceChangesToRow(changes: InvoiceChanges): Row {
  const row: Row = {};
  (Object.keys(changes) as (keyof InvoiceChanges)[]).forEach((key) => {
    const value = changes[key];
    row[key] = typeof value === "boolean" ? value : nullIfEmpty(value as string | undefined);
  });
  return row;
}

// ====================================================================
// Thanh toán
// ====================================================================
export type NewPaymentInput = Pick<
  Payment,
  "invoice_id" | "payment_date" | "amount" | "payment_method" | "transaction_ref" | "notes"
>;

export function toPayment(r: Row): Payment {
  return {
    id: r.id,
    invoice_id: r.invoice_id,
    company_id: optStr(r.invoices?.company_id),
    payment_date: str(r.payment_date),
    amount: num(r.amount),
    payment_method:
      r.payment_method === "cash" || r.payment_method === "other" ? r.payment_method : "bank_transfer",
    transaction_ref: optStr(r.transaction_ref),
    proof_file_url: optStr(r.proof_file_url),
    notes: optStr(r.notes),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

export function paymentToRow(p: NewPaymentInput): Row {
  return {
    invoice_id: p.invoice_id,
    payment_date: p.payment_date,
    amount: num(p.amount),
    payment_method: p.payment_method,
    transaction_ref: nullIfEmpty(trimmed(p.transaction_ref)),
    notes: nullIfEmpty(trimmed(p.notes)),
  };
}

// ====================================================================
// Lịch sử liên hệ & lịch hẹn thanh toán
// ====================================================================
export type NewContactInput = {
  invoice_id: string;
  company_id: string;
  channel: ContactChannel;
  contact_person: string;
  content: string;
  result: ContactResult;
  promised_date?: string;
  next_step_notes?: string;
};

export type NewPromiseInput = {
  invoice_id: string;
  company_id: string;
  contact_history_id?: string;
  promised_date: string;
  promised_amount?: number;
  notes?: string;
};

export function toContact(r: Row): ContactHistory {
  return {
    id: r.id,
    invoice_id: r.invoice_id,
    company_id: r.company_id,
    company_name: optStr(r.companies?.name),
    invoice_number: optStr(r.invoices?.invoice_number),
    contact_date: str(r.contact_date),
    channel: r.channel as ContactChannel,
    contact_person: str(r.contact_person),
    content: str(r.content),
    result: r.result as ContactResult,
    promised_date: optStr(r.promised_date),
    next_step_notes: optStr(r.next_step_notes),
    created_at: str(r.created_at),
  };
}

export function contactToRow(c: NewContactInput): Row {
  return {
    invoice_id: c.invoice_id,
    company_id: c.company_id,
    contact_date: new Date().toISOString(),
    channel: c.channel,
    contact_person: trimmed(c.contact_person),
    content: trimmed(c.content),
    result: c.result,
    promised_date: nullIfEmpty(c.promised_date),
    next_step_notes: nullIfEmpty(trimmed(c.next_step_notes)),
  };
}

export function toPromise(r: Row): PaymentPromise {
  return {
    id: r.id,
    invoice_id: r.invoice_id,
    company_id: r.company_id,
    company_name: optStr(r.companies?.name),
    invoice_number: optStr(r.invoices?.invoice_number),
    promised_date: str(r.promised_date),
    promised_amount: r.promised_amount === null || r.promised_amount === undefined ? undefined : num(r.promised_amount),
    contact_history_id: optStr(r.contact_history_id),
    status: (r.status || "pending") as PaymentPromise["status"],
    notes: optStr(r.notes),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

export function promiseToRow(p: NewPromiseInput): Row {
  return {
    invoice_id: p.invoice_id,
    company_id: p.company_id,
    contact_history_id: nullIfEmpty(p.contact_history_id),
    promised_date: p.promised_date,
    promised_amount: p.promised_amount && p.promised_amount > 0 ? p.promised_amount : null,
    status: "pending",
    notes: nullIfEmpty(trimmed(p.notes)),
  };
}

// ====================================================================
// Cài đặt hệ thống
// ====================================================================
const asNumberArray = (v: unknown, fallback: number[]): number[] =>
  Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n)) : fallback;

export function toSettings(r: Row): AppSettings {
  return {
    id: r.id,
    owner_name: str(r.owner_name) || DEFAULT_SETTINGS.owner_name,
    owner_email: str(r.owner_email) || DEFAULT_SETTINGS.owner_email,
    owner_phone: optStr(r.owner_phone),
    send_daily_digest_email: Boolean(r.send_daily_digest_email),
    daily_digest_time: str(r.daily_digest_time) || DEFAULT_SETTINGS.daily_digest_time,
    timezone: str(r.timezone) || DEFAULT_SETTINGS.timezone,
    reminder_days_before: asNumberArray(r.reminder_days_before, DEFAULT_SETTINGS.reminder_days_before),
    reminder_days_overdue: asNumberArray(r.reminder_days_overdue, DEFAULT_SETTINGS.reminder_days_overdue),
    recurring_overdue_interval_days:
      num(r.recurring_overdue_interval_days) || DEFAULT_SETTINGS.recurring_overdue_interval_days,
    email_from: optStr(r.email_from),
    updated_at: optStr(r.updated_at),
  };
}

export function settingsToRow(s: AppSettings): Row {
  return {
    owner_name: trimmed(s.owner_name) || DEFAULT_SETTINGS.owner_name,
    owner_email: trimmed(s.owner_email) || DEFAULT_SETTINGS.owner_email,
    owner_phone: nullIfEmpty(trimmed(s.owner_phone)),
    send_daily_digest_email: Boolean(s.send_daily_digest_email),
    daily_digest_time: s.daily_digest_time,
    timezone: s.timezone,
    reminder_days_before: s.reminder_days_before,
    reminder_days_overdue: s.reminder_days_overdue,
    recurring_overdue_interval_days: s.recurring_overdue_interval_days,
    updated_at: new Date().toISOString(),
  };
}
