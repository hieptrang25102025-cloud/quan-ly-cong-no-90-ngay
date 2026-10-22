import {
  DebtStatus,
  Invoice,
  NotificationItem,
  NotificationPriority,
  NotificationType,
  PaymentPromise,
  AppSettings,
} from "@/types/debt";

/**
 * Format date to YYYY-MM-DD string in Asia/Ho_Chi_Minh or UTC date string
 */
export function formatDateOnly(date: string | Date): string {
  if (!date) return "";
  if (typeof date === "string") {
    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format VN date DD/MM/YYYY
 */
export function formatVNDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const str = formatDateOnly(dateStr);
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return "-";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Format currency VNĐ
 */
export function formatVNCurrency(amount: number = 0): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
}

/**
 * Parses YYYY-MM-DD into a localized midnight Date object
 */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Difference in calendar days: (dateB - dateA)
 */
export function diffCalendarDays(dateA: string | Date, dateB: string | Date): number {
  const da = typeof dateA === "string" ? parseDateOnly(formatDateOnly(dateA)) : new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const db = typeof dateB === "string" ? parseDateOnly(formatDateOnly(dateB)) : new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  const msDiff = db.getTime() - da.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Tính hạn thanh toán = ngày bắt đầu tính hạn đã xác nhận + số ngày lịch (mặc định 90 ngày)
 * Xử lý chính xác ngày cuối tháng, năm nhuận.
 */
export function calculateDueDate(confirmedStartDate: string | Date, termsDays: number = 90): string {
  if (!confirmedStartDate) return "";
  const base = typeof confirmedStartDate === "string" ? parseDateOnly(formatDateOnly(confirmedStartDate)) : new Date(confirmedStartDate);
  const result = new Date(base.getFullYear(), base.getMonth(), base.getDate() + termsDays);
  return formatDateOnly(result);
}

/**
 * Tính số ngày quá hạn tại một thời điểm (asOfDate)
 * Nếu chưa đến hạn => 0 ngày.
 * Nếu đã quá hạn => số ngày thực tế.
 */
export function calculateDaysOverdue(dueDate: string | Date, asOfDate: string | Date = new Date()): number {
  if (!dueDate) return 0;
  const daysDiff = diffCalendarDays(dueDate, asOfDate);
  return daysDiff > 0 ? daysDiff : 0;
}

/**
 * Tính số ngày còn lại đến hạn
 * Nếu đã quá hạn => 0 hoặc số âm
 */
export function calculateDaysRemaining(dueDate: string | Date, asOfDate: string | Date = new Date()): number {
  if (!dueDate) return 0;
  const daysDiff = diffCalendarDays(asOfDate, dueDate);
  return daysDiff;
}

/**
 * Công thức tính tiền phạt chậm trả tạm tính:
 * Tiền phạt = Tiền gốc chậm trả × Mức phạt/ngày (mặc định 0.1% = 0.001) × Số ngày chậm
 * Ví dụ: 100.000.000 VNĐ × 0.1% × 10 ngày = 1.000.000 VNĐ.
 */
export function calculateEstimatedPenalty(
  principalOverdue: number,
  dailyRate: number = 0.001,
  daysOverdue: number = 0
): number {
  if (principalOverdue <= 0 || daysOverdue <= 0 || dailyRate <= 0) {
    return 0;
  }
  return Math.round(principalOverdue * dailyRate * daysOverdue);
}

/**
 * Xác định trạng thái công nợ thực tế
 */
export function determineDebtStatus(
  invoice: Partial<Invoice>,
  asOfDate: string | Date = new Date()
): DebtStatus {
  // 1. Kiểm tra tính đủ hồ sơ
  if (!invoice.confirmed_start_date) {
    if (!invoice.confirmed_receipt_date || !invoice.sent_acceptance_date || !invoice.sent_invoice_date) {
      return "incomplete_dossier";
    }
    return "pending_confirmation";
  }

  // 2. Kiểm tra nếu đã thanh toán hết
  const total = invoice.total_amount || 0;
  const paid = invoice.paid_amount || 0;
  const remaining = total - paid;
  if (total > 0 && remaining <= 0) {
    return "fully_paid";
  }

  // 3. Kiểm tra tạm dừng / tranh chấp
  if (invoice.is_paused) {
    return "paused";
  }
  if (invoice.dispute_reason) {
    return "disputed";
  }

  // 4. Kiểm tra gia hạn
  const effectiveDueDate = invoice.extended_due_date || invoice.due_date;
  if (!effectiveDueDate) {
    return "pending_confirmation";
  }

  const daysOverdue = calculateDaysOverdue(effectiveDueDate, asOfDate);
  const daysRemaining = calculateDaysRemaining(effectiveDueDate, asOfDate);

  if (daysOverdue > 0) {
    return "overdue";
  }

  if (daysRemaining === 0) {
    return "due_today";
  }

  if (invoice.extended_due_date) {
    return "extended";
  }

  if (paid > 0 && remaining > 0) {
    return "partially_paid";
  }

  if (daysRemaining <= 15) {
    return "upcoming_due";
  }

  return "not_due_yet";
}

/**
 * Cập nhật số dư và phân bổ thanh toán
 */
export function allocatePayment(
  currentPaidAmount: number,
  totalAmount: number,
  newPaymentAmount: number
): {
  newPaidAmount: number;
  newRemainingBalance: number;
  isFullyPaid: boolean;
  overpaidAmount: number;
} {
  const newPaidAmount = currentPaidAmount + newPaymentAmount;
  const remaining = totalAmount - newPaidAmount;
  const isFullyPaid = remaining <= 0;
  const overpaidAmount = remaining < 0 ? Math.abs(remaining) : 0;
  const newRemainingBalance = Math.max(0, remaining);

  return {
    newPaidAmount,
    newRemainingBalance,
    isFullyPaid,
    overpaidAmount,
  };
}

/**
 * Tạo khóa chống trùng thông báo (dedup_key)
 */
export function generateDedupKey(
  invoiceId: string,
  notificationType: NotificationType,
  milestoneKey: string
): string {
  return `${invoiceId}:${notificationType}:${milestoneKey}`;
}

export interface GeneratedNotificationPayload {
  invoice_id: string;
  company_id: string;
  company_name: string;
  invoice_number: string;
  contract_number?: string;
  notification_type: NotificationType;
  milestone_date: string;
  dedup_key: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  suggested_action: string;
  remaining_balance: number;
  estimated_penalty: number;
  days_overdue: number;
}

/**
 * Bộ sinh thông báo tự động trên máy chủ theo quy tắc:
 * - Trước hạn 15 ngày, 7 ngày, 3 ngày
 * - Đúng ngày đến hạn
 * - Quá hạn 1 ngày, 7 ngày, 15 ngày, 30 ngày, 60 ngày, 90 ngày
 * - Sau 30 ngày quá hạn: mỗi 7 ngày thông báo định kỳ lặp lại
 * - Đến ngày khách hẹn trả nợ (Payment Promise)
 * - Hồ sơ thiếu mốc bắt đầu tính hạn
 */
export function evaluateNotifications(
  invoices: Invoice[],
  promises: PaymentPromise[] = [],
  asOfDate: string | Date = new Date(),
  settings?: Partial<AppSettings>
): GeneratedNotificationPayload[] {
  const todayStr = formatDateOnly(asOfDate);
  const notifications: GeneratedNotificationPayload[] = [];

  const reminderDaysBefore = settings?.reminder_days_before || [15, 7, 3];
  const reminderDaysOverdue = settings?.reminder_days_overdue || [1, 7, 15, 30, 60, 90];
  const recurringInterval = settings?.recurring_overdue_interval_days || 7;

  // 1. Kiểm tra từng hóa đơn
  for (const inv of invoices) {
    // Nếu đã thanh toán hết hoặc đang tạm dừng thì bỏ qua cảnh báo công nợ thông thường
    const remaining = inv.remaining_balance ?? (inv.total_amount - (inv.paid_amount || 0));
    if (remaining <= 0) continue;
    if (inv.is_paused) continue;

    // A. Kiểm tra hồ sơ thiếu mốc bắt đầu tính hạn
    if (!inv.confirmed_start_date) {
      const dedupKey = generateDedupKey(inv.id, "incomplete_dossier", inv.invoice_date || todayStr);
      notifications.push({
        invoice_id: inv.id,
        company_id: inv.company_id,
        company_name: inv.company_name || "Khách hàng",
        invoice_number: inv.invoice_number,
        contract_number: inv.contract_number,
        notification_type: "incomplete_dossier",
        milestone_date: todayStr,
        dedup_key: dedupKey,
        title: `Hồ sơ hóa đơn ${inv.invoice_number} chưa có mốc tính hạn`,
        message: `Hóa đơn số ${inv.invoice_number} (${formatVNCurrency(inv.total_amount)}) của ${inv.company_name || "khách hàng"} chưa xác nhận ngày Bên B nhận đủ hồ sơ. Vui lòng đối soát và cập nhật ngày bắt đầu tính hạn 90 ngày.`,
        priority: "medium",
        suggested_action: "Kiểm tra biên bản bàn giao, liên hệ xác nhận ngày nhận hồ sơ với Bên B",
        remaining_balance: remaining,
        estimated_penalty: 0,
        days_overdue: 0,
      });
      continue;
    }

    const effectiveDueDate = inv.extended_due_date || inv.due_date;
    if (!effectiveDueDate) continue;

    const daysRemaining = calculateDaysRemaining(effectiveDueDate, asOfDate);
    const daysOverdue = calculateDaysOverdue(effectiveDueDate, asOfDate);
    const penalty = calculateEstimatedPenalty(remaining, 0.001, daysOverdue);

    // B. Cảnh báo trước hạn: 15 ngày, 7 ngày, 3 ngày
    for (const d of reminderDaysBefore) {
      if (daysRemaining === d) {
        const notifType: NotificationType =
          d === 15 ? "upcoming_15d" : d === 7 ? "upcoming_7d" : "upcoming_3d";
        const priority: NotificationPriority = d <= 3 ? "high" : "medium";
        const dedupKey = generateDedupKey(inv.id, notifType, effectiveDueDate);

        notifications.push({
          invoice_id: inv.id,
          company_id: inv.company_id,
          company_name: inv.company_name || "Khách hàng",
          invoice_number: inv.invoice_number,
          contract_number: inv.contract_number,
          notification_type: notifType,
          milestone_date: todayStr,
          dedup_key: dedupKey,
          title: `Khoản nợ ${inv.invoice_number} sắp đến hạn (còn ${d} ngày)`,
          message: `${inv.company_name} còn khoản công nợ ${formatVNCurrency(remaining)}, hóa đơn ${inv.invoice_number}, sẽ đến hạn vào ngày ${formatVNDate(effectiveDueDate)} (còn ${d} ngày).`,
          priority,
          suggested_action: d <= 3 ? "Gọi điện hoặc nhắn Zalo nhắc nhẹ kế toán khách hàng xếp lịch thanh toán" : "Chuẩn bị rà soát đối chiếu hồ sơ trước ngày đến hạn",
          remaining_balance: remaining,
          estimated_penalty: 0,
          days_overdue: 0,
        });
      }
    }

    // C. Đúng ngày đến hạn: 0 ngày
    if (daysRemaining === 0) {
      const dedupKey = generateDedupKey(inv.id, "due_today", effectiveDueDate);
      notifications.push({
        invoice_id: inv.id,
        company_id: inv.company_id,
        company_name: inv.company_name || "Khách hàng",
        invoice_number: inv.invoice_number,
        contract_number: inv.contract_number,
        notification_type: "due_today",
        milestone_date: todayStr,
        dedup_key: dedupKey,
        title: `Khoản nợ ${inv.invoice_number} ĐẾN HẠN HÔM NAY`,
        message: `${inv.company_name} có khoản công nợ ${formatVNCurrency(remaining)}, hóa đơn ${inv.invoice_number}, đến hạn thanh toán 90 ngày hôm nay (${formatVNDate(effectiveDueDate)}).`,
        priority: "high",
        suggested_action: "Kiểm tra sao kê tài khoản ngân hàng và liên hệ trực tiếp phụ trách thanh toán của Bên B",
        remaining_balance: remaining,
        estimated_penalty: 0,
        days_overdue: 0,
      });
    }

    // D. Cảnh báo quá hạn mốc: 1, 7, 15, 30, 60, 90 ngày
    for (const od of reminderDaysOverdue) {
      if (daysOverdue === od) {
        let notifType: NotificationType = "overdue_1d";
        if (od === 7) notifType = "overdue_7d";
        else if (od === 15) notifType = "overdue_15d";
        else if (od === 30) notifType = "overdue_30d";
        else if (od === 60) notifType = "overdue_60d";
        else if (od === 90) notifType = "overdue_90d";

        const priority: NotificationPriority = od >= 30 ? "urgent" : od >= 7 ? "high" : "medium";
        const dedupKey = generateDedupKey(inv.id, notifType, `${effectiveDueDate}_d${od}`);

        notifications.push({
          invoice_id: inv.id,
          company_id: inv.company_id,
          company_name: inv.company_name || "Khách hàng",
          invoice_number: inv.invoice_number,
          contract_number: inv.contract_number,
          notification_type: notifType,
          milestone_date: todayStr,
          dedup_key: dedupKey,
          title: `Công nợ ${inv.invoice_number} đã QUÁ HẠN ${od} ngày`,
          message: `${inv.company_name} còn khoản công nợ ${formatVNCurrency(remaining)}, hóa đơn ${inv.invoice_number}, đã quá hạn ${od} ngày. Tiền phạt tạm tính hiện tại là ${formatVNCurrency(penalty)} (0,1%/ngày).`,
          priority,
          suggested_action: od >= 30 ? "Gửi công văn đôn đốc hoặc làm việc trực tiếp với Giám đốc/đại diện Bên B" : "Liên hệ kế toán trưởng/phụ trách thanh toán để xác nhận lịch trả",
          remaining_balance: remaining,
          estimated_penalty: penalty,
          days_overdue: daysOverdue,
        });
      }
    }

    // E. Sau 30 ngày quá hạn: thông báo định kỳ mỗi 7 ngày
    if (daysOverdue > 30 && (daysOverdue - 30) % recurringInterval === 0 && !reminderDaysOverdue.includes(daysOverdue)) {
      const dedupKey = generateDedupKey(inv.id, "overdue_recurring_7d", `${effectiveDueDate}_d${daysOverdue}`);
      notifications.push({
        invoice_id: inv.id,
        company_id: inv.company_id,
        company_name: inv.company_name || "Khách hàng",
        invoice_number: inv.invoice_number,
        contract_number: inv.contract_number,
        notification_type: "overdue_recurring_7d",
        milestone_date: todayStr,
        dedup_key: dedupKey,
        title: `Nhắc định kỳ: Hóa đơn ${inv.invoice_number} quá hạn ${daysOverdue} ngày`,
        message: `${inv.company_name} vẫn chưa thanh toán ${formatVNCurrency(remaining)} (quá hạn ${daysOverdue} ngày). Tiền phạt tạm tính lũy kế: ${formatVNCurrency(penalty)}.`,
        priority: "urgent",
        suggested_action: "Đánh giá khả năng thu hồi, yêu cầu ký cam kết tiến độ thanh toán hoặc lập biên bản đối chiếu công nợ",
        remaining_balance: remaining,
        estimated_penalty: penalty,
        days_overdue: daysOverdue,
      });
    }
  }

  // 2. Kiểm tra các cam kết thanh toán (Payment Promises)
  for (const promise of promises) {
    if (promise.status === "pending" && promise.promised_date === todayStr) {
      const dedupKey = generateDedupKey(promise.invoice_id, "promised_payment_due", promise.promised_date);
      notifications.push({
        invoice_id: promise.invoice_id,
        company_id: promise.company_id,
        company_name: promise.company_name || "Khách hàng",
        invoice_number: promise.invoice_number || "",
        notification_type: "promised_payment_due",
        milestone_date: todayStr,
        dedup_key: dedupKey,
        title: `HÔM NAY: Đến ngày khách hẹn thanh toán hóa đơn ${promise.invoice_number || ""}`,
        message: `${promise.company_name} đã hẹn thanh toán vào hôm nay (${formatVNDate(todayStr)}) số tiền ${promise.promised_amount ? formatVNCurrency(promise.promised_amount) : "theo thỏa thuận"}. Vui lòng kiểm tra tài khoản ngân hàng.`,
        priority: "urgent",
        suggested_action: "Kiểm tra biến động số dư ngân hàng; nếu chưa có tiền thì liên hệ ngay để đôn đốc",
        remaining_balance: promise.promised_amount || 0,
        estimated_penalty: 0,
        days_overdue: 0,
      });
    }
  }

  return notifications;
}
