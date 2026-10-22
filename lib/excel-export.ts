import * as XLSX from "xlsx";
import { Invoice, Payment, ContactHistory, PaymentPromise, Company } from "@/types/debt";
import { formatVNDate, formatVNCurrency } from "./debt-engine";

export interface ExcelExportData {
  companies: Company[];
  invoices: Invoice[];
  payments: Payment[];
  contacts: ContactHistory[];
  promises: PaymentPromise[];
}

export function generateDebtWorkbook(data: ExcelExportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Báo Cáo Tổng Hợp Công Nợ
  const summaryRows = data.invoices.map((inv, idx) => {
    return {
      "STT": idx + 1,
      "Tên Khách Hàng": inv.company_name || "",
      "Số Hợp Đồng": inv.contract_number || "Theo thỏa thuận",
      "Số Hóa Đơn": inv.invoice_number,
      "Ký Hiệu": inv.invoice_serial || "",
      "Ngày HĐ": formatVNDate(inv.invoice_date),
      "Ngày Nghiệm Thu": formatVNDate(inv.acceptance_date),
      "Ngày Bắt Đầu Tính Hạn": formatVNDate(inv.confirmed_start_date),
      "Hạn Thanh Toán (90 ngày)": formatVNDate(inv.extended_due_date || inv.due_date),
      "Tổng Giá Trị (VNĐ)": inv.total_amount,
      "Đã Thanh Toán (VNĐ)": inv.paid_amount,
      "Dư Nợ Còn Lại (VNĐ)": inv.remaining_balance,
      "Số Ngày Quá Hạn": inv.days_overdue,
      "Tiền Phạt Tạm Tính (0.1%/ngày)": inv.estimated_penalty,
      "Trạng Thái": getStatusText(inv.status),
      "Ghi Chú": inv.notes || "",
    };
  });
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Tong_Hop_Cong_No");

  // 2. Sheet: Công Nợ Quá Hạn & Tiền Phạt
  const overdueInvoices = data.invoices.filter((i) => i.days_overdue > 0 && i.remaining_balance > 0);
  const overdueRows = overdueInvoices.map((inv, idx) => ({
    "STT": idx + 1,
    "Khách Hàng": inv.company_name || "",
    "Hóa Đơn": inv.invoice_number,
    "Hạn TT": formatVNDate(inv.extended_due_date || inv.due_date),
    "Dư Nợ Chậm Trả (VNĐ)": inv.remaining_balance,
    "Số Ngày Chậm": inv.days_overdue,
    "Mức Phạt / Ngày": "0.1%",
    "Phạt Chậm Trả Tạm Tính (VNĐ)": inv.estimated_penalty,
    "Phân Nhóm Quá Hạn": getAgingGroup(inv.days_overdue),
    "Ghi Chú Xử Lý": inv.notes || "",
  }));
  const wsOverdue = XLSX.utils.json_to_sheet(overdueRows);
  XLSX.utils.book_append_sheet(wb, wsOverdue, "Cong_No_Qua_Han");

  // 3. Sheet: Lịch Sử Thanh Toán
  const paymentRows = data.payments.map((p, idx) => ({
    "STT": idx + 1,
    "Mã Giao Dịch": p.transaction_ref || p.id.slice(0, 8),
    "Ngày Thanh Toán": formatVNDate(p.payment_date),
    "Hóa Đơn": p.invoice_id,
    "Số Tiền Đã Trả (VNĐ)": p.amount,
    "Hình Thức": p.payment_method === "bank_transfer" ? "Chuyển khoản ngân hàng" : "Tiền mặt",
    "Ghi Chú": p.notes || "",
  }));
  const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
  XLSX.utils.book_append_sheet(wb, wsPayments, "Lich_Su_Thanh_Toan");

  // 4. Sheet: Lịch Sử Đôn Đốc & Hẹn Trả
  const contactRows = data.contacts.map((c, idx) => ({
    "STT": idx + 1,
    "Thời Gian": formatVNDate(c.contact_date),
    "Khách Hàng": c.company_name || "",
    "Hóa Đơn": c.invoice_number || "",
    "Hình Thức": c.channel === "call" ? "Gọi điện thoại" : c.channel === "zalo" ? "Nhắn tin Zalo" : "Email",
    "Người Trao Đổi": c.contact_person,
    "Nội Dung": c.content,
    "Kết Quả": c.result,
    "Ngày Hẹn Thanh Toán": formatVNDate(c.promised_date),
    "Ghi Chú Tiếp Theo": c.next_step_notes || "",
  }));
  const wsContacts = XLSX.utils.json_to_sheet(contactRows);
  XLSX.utils.book_append_sheet(wb, wsContacts, "Lich_Su_Lien_He");

  return wb;
}

export function exportDebtReportToExcel(data: ExcelExportData, filename: string = "Bao_Cao_Cong_No_90_Ngay.xlsx") {
  const wb = generateDebtWorkbook(data);
  XLSX.writeFile(wb, filename);
}

function getStatusText(status: string): string {
  switch (status) {
    case "fully_paid": return "Đã thanh toán đủ";
    case "partially_paid": return "Đã thanh toán một phần";
    case "overdue": return "Quá hạn thanh toán";
    case "due_today": return "Đến hạn hôm nay";
    case "upcoming_due": return "Sắp đến hạn (<= 15 ngày)";
    case "not_due_yet": return "Chưa đến hạn";
    case "incomplete_dossier": return "Thiếu hồ sơ";
    case "pending_confirmation": return "Chờ xác nhận mốc tính hạn";
    case "paused": return "Tạm dừng xử lý";
    case "disputed": return "Đang tranh chấp";
    case "extended": return "Được gia hạn";
    default: return status;
  }
}

function getAgingGroup(days: number): string {
  if (days <= 7) return "Quá hạn 1 - 7 ngày";
  if (days <= 15) return "Quá hạn 8 - 15 ngày";
  if (days <= 30) return "Quá hạn 16 - 30 ngày";
  if (days <= 60) return "Quá hạn 31 - 60 ngày";
  if (days <= 90) return "Quá hạn 61 - 90 ngày";
  return "Quá hạn trên 90 ngày (Cực kỳ nghiêm trọng)";
}
