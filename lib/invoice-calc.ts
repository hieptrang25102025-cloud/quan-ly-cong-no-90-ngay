import { Invoice } from "@/types/debt";
import {
  calculateDaysOverdue,
  calculateDueDate,
  calculateEstimatedPenalty,
  determineDebtStatus,
} from "./debt-engine";

/**
 * Tính lại các trường dẫn xuất của hóa đơn:
 * hạn thanh toán, số dư, số ngày quá hạn, tiền phạt tạm tính (0,1%/ngày), trạng thái.
 */
export function recalcInvoice(invoice: Invoice, asOf: Date = new Date()): Invoice {
  const total = Number(invoice.total_amount) || 0;
  const paid = Number(invoice.paid_amount) || 0;
  const remaining = Math.max(0, total - paid);

  const dueDate =
    invoice.due_date ||
    (invoice.confirmed_start_date ? calculateDueDate(invoice.confirmed_start_date, 90) : undefined);

  const effectiveDue = invoice.extended_due_date || dueDate;
  const daysOverdue = remaining > 0 && effectiveDue ? calculateDaysOverdue(effectiveDue, asOf) : 0;
  const penalty = calculateEstimatedPenalty(remaining, 0.001, daysOverdue);

  const next: Invoice = {
    ...invoice,
    due_date: dueDate,
    paid_amount: paid,
    remaining_balance: remaining,
    days_overdue: daysOverdue,
    estimated_penalty: penalty,
  };

  return { ...next, status: determineDebtStatus(next, asOf) };
}