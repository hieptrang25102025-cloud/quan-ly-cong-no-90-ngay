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


// ====================================================================
// THƯ ĐỀ NGHỊ THANH TOÁN GỬI KHÁCH HÀNG (mỗi công ty một sheet)
// ====================================================================
export interface PaymentLetterOptions {
  /** Ảnh con dấu (data URL, PNG/JPG). Bỏ trống = chừa trắng để in ra đóng dấu. */
  stampDataUrl?: string;
  /** Ảnh chữ ký (data URL, PNG/JPG). */
  signatureDataUrl?: string;
  /** Số ngày tính là "sắp đến hạn" (mặc định 7). */
  dueWithinDays?: number;
}

const HKD_INFO = {
  shopName: "CỬA HÀNG SÁU NHIỀU",
  ownerName: "HỘ KINH DOANH TRẦN THẢO TRANG",
  taxCode: "086300008730",
  address: "243 Lê Đức Anh, P. Bình Hưng Hòa, TP. Hồ Chí Minh",
  hotline: "0937 816 310 - 0972 546 536",
  email: "Hieptrang25102025@gmail.com",
  signer: "TRẦN THẢO TRANG",
};

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export async function exportPaymentRequestLetters(
  data: { companies: Company[]; invoices: Invoice[] },
  options: PaymentLetterOptions = {},
  filename: string = "Thu_De_Nghi_Thanh_Toan.xlsx"
): Promise<number> {
  const ExcelJS: any = await import("exceljs");
  const Workbook = ExcelJS.Workbook || ExcelJS.default.Workbook;
  const wb = new Workbook();

  const within = options.dueWithinDays ?? 7;
  const NAVY = "FF1F3864";
  const FONT = "Times New Roman";
  const thin = { style: "thin", color: { argb: "FF7F7F7F" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const MONEY = '#,##0 "đ"';
  const now = new Date();
  const dateLine = `TP. Hồ Chí Minh, ngày ${String(now.getDate()).padStart(2, "0")} tháng ${String(
    now.getMonth() + 1
  ).padStart(2, "0")} năm ${now.getFullYear()}`;

  const stampId = options.stampDataUrl
    ? wb.addImage({
        base64: options.stampDataUrl.split(",")[1],
        extension: options.stampDataUrl.startsWith("data:image/jpeg") ? "jpeg" : "png",
      })
    : null;
  const signId = options.signatureDataUrl
    ? wb.addImage({
        base64: options.signatureDataUrl.split(",")[1],
        extension: options.signatureDataUrl.startsWith("data:image/jpeg") ? "jpeg" : "png",
      })
    : null;

  let sheets = 0;

  for (const company of data.companies) {
    const list = data.invoices.filter((i) => i.company_id === company.id && i.remaining_balance > 0);
    const overdue = list.filter((i) => i.days_overdue > 0);
    const upcoming = list.filter((i) => {
      if (i.days_overdue > 0) return false;
      const d = daysUntil(i.extended_due_date || i.due_date);
      return d !== null && d >= 0 && d <= within;
    });
    if (overdue.length === 0 && upcoming.length === 0) continue;
    sheets++;

    const safeName = (company.name || "Khach hang").replace(/[\\/?*\[\]:]/g, "").slice(0, 24);
    const ws = wb.addWorksheet(`${sheets}. ${safeName}`, {
      pageSetup: {
        paperSize: 9,
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.6, right: 0.6, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
      },
      views: [{ showGridLines: false }],
    });
    [6, 16, 14, 16, 18, 18, 22].forEach((w, idx) => (ws.getColumn(idx + 1).width = w));

    let r = 1;
    const line = (
      text: string,
      opts: { bold?: boolean; italic?: boolean; size?: number; align?: string; color?: string; height?: number; wrap?: boolean; from?: number } = {}
    ) => {
      const from = opts.from ?? 1;
      ws.mergeCells(r, from, r, 7);
      const c = ws.getCell(r, from);
      c.value = text;
      c.font = { name: FONT, size: opts.size ?? 12, bold: !!opts.bold, italic: !!opts.italic, color: opts.color ? { argb: opts.color } : undefined };
      c.alignment = { horizontal: opts.align ?? "left", vertical: "middle", wrapText: opts.wrap !== false };
      if (opts.height) ws.getRow(r).height = opts.height;
      r++;
    };

    // --- Quốc hiệu ---
    line("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true, size: 13, align: "center" });
    line("Độc lập - Tự do - Hạnh phúc", { bold: true, size: 12, align: "center" });
    line("--------------------", { align: "center" });
    r++;

    // --- Thông tin hộ kinh doanh ---
    line(HKD_INFO.shopName, { bold: true, size: 13, color: NAVY });
    line(`(${HKD_INFO.ownerName})`, { bold: true });
    line(`Mã số thuế: ${HKD_INFO.taxCode}`);
    line(`Địa chỉ: ${HKD_INFO.address}`, { height: 18 });
    line(`Hotline: ${HKD_INFO.hotline}  |  Email: ${HKD_INFO.email}`, { height: 18 });
    line(dateLine, { italic: true, align: "right" });
    r++;

    // --- Tiêu đề ---
    line("THƯ ĐỀ NGHỊ THANH TOÁN CÔNG NỢ", { bold: true, size: 16, align: "center", color: NAVY, height: 30 });
    r++;

    // --- Kính gửi ---
    line(`Kính gửi: ${company.name}`, { bold: true, height: 20 });
    if (company.tax_code) line(`Mã số thuế: ${company.tax_code}`);
    if (company.address) line(`Địa chỉ: ${company.address}`, { height: 34 });
    if (company.contact_person) line(`Người liên hệ: ${company.contact_person}`);
    r++;

    line(
      `Căn cứ hợp đồng nguyên tắc và các hóa đơn đã giao, ${HKD_INFO.ownerName} xin gửi Quý công ty bảng đối chiếu công nợ tính đến ngày ${formatVNDate(
        now.toISOString().slice(0, 10)
      )} như sau:`,
      { height: 36 }
    );
    r++;

    const header = (cols: string[]) => {
      cols.forEach((t, idx) => {
        const c = ws.getCell(r, idx + 1);
        c.value = t;
        c.font = { name: FONT, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        c.border = border;
      });
      ws.getRow(r).height = 32;
      r++;
    };
    const cell = (col: number, value: any, align: string = "left", fmt?: string, bold = false) => {
      const c = ws.getCell(r, col);
      c.value = value;
      c.font = { name: FONT, size: 11, bold };
      c.alignment = { horizontal: align, vertical: "middle", wrapText: true };
      c.border = border;
      if (fmt) c.numFmt = fmt;
    };

    // --- I. Sắp đến hạn ---
    if (upcoming.length > 0) {
      line(`I. CÁC KHOẢN SẮP ĐẾN HẠN THANH TOÁN (TRONG ${within} NGÀY TỚI)`, { bold: true, color: NAVY, height: 22 });
      header(["STT", "Số hóa đơn", "Ký hiệu", "Ngày xuất HĐ", "Hạn thanh toán", "Còn lại (ngày)", "Số tiền cần thanh toán"]);
      let sumUp = 0;
      upcoming.forEach((inv, idx) => {
        const due = inv.extended_due_date || inv.due_date;
        sumUp += inv.remaining_balance;
        cell(1, idx + 1, "center");
        cell(2, inv.invoice_number, "center");
        cell(3, inv.invoice_serial || "", "center");
        cell(4, formatVNDate(inv.invoice_date), "center");
        cell(5, formatVNDate(due), "center");
        cell(6, daysUntil(due) ?? "", "center");
        cell(7, inv.remaining_balance, "right", MONEY);
        r++;
      });
      ws.mergeCells(r, 1, r, 6);
      cell(1, "Cộng nợ sắp đến hạn", "right", undefined, true);
      for (let c = 2; c <= 6; c++) ws.getCell(r, c).border = border;
      cell(7, sumUp, "right", MONEY, true);
      r += 2;
    }

    // --- II. Quá hạn ---
    if (overdue.length > 0) {
      line("II. CÁC KHOẢN ĐÃ QUÁ HẠN THANH TOÁN", { bold: true, color: "FFC00000", height: 22 });
      header(["STT", "Số hóa đơn", "Ký hiệu", "Hạn thanh toán", "Số ngày chậm", "Dư nợ chậm trả", "Tiền phạt tạm tính (0,1%/ngày)"]);
      let sumDebt = 0;
      let sumPen = 0;
      overdue.forEach((inv, idx) => {
        sumDebt += inv.remaining_balance;
        sumPen += inv.estimated_penalty || 0;
        cell(1, idx + 1, "center");
        cell(2, inv.invoice_number, "center");
        cell(3, inv.invoice_serial || "", "center");
        cell(4, formatVNDate(inv.extended_due_date || inv.due_date), "center");
        cell(5, inv.days_overdue, "center");
        cell(6, inv.remaining_balance, "right", MONEY);
        cell(7, inv.estimated_penalty || 0, "right", MONEY);
        r++;
      });
      ws.mergeCells(r, 1, r, 5);
      cell(1, "Cộng nợ quá hạn", "right", undefined, true);
      for (let c = 2; c <= 5; c++) ws.getCell(r, c).border = border;
      cell(6, sumDebt, "right", MONEY, true);
      cell(7, sumPen, "right", MONEY, true);
      r += 2;
    }

    const grand = [...upcoming, ...overdue].reduce((s, i) => s + i.remaining_balance, 0);
    line(`TỔNG SỐ TIỀN ĐỀ NGHỊ THANH TOÁN (chưa gồm tiền phạt): ${formatVNCurrency(grand)}`, { bold: true, size: 12, height: 24 });
    line("Ghi chú: Tiền phạt chậm trả chỉ là số tạm tính để đối chiếu, tính theo mức 0,1%/ngày trên số dư chậm trả theo hợp đồng.", {
      italic: true,
      size: 10,
      height: 30,
    });
    r++;

    line(
      "Để bảo đảm tiến độ hợp tác, chúng tôi kính đề nghị Quý công ty sắp xếp thanh toán các khoản nêu trên theo đúng hợp đồng. Nếu Quý công ty đã thanh toán, xin vui lòng bỏ qua thư này và gửi lại chứng từ để chúng tôi đối chiếu. Mọi thắc mắc xin liên hệ hotline " +
        HKD_INFO.hotline +
        ". Trân trọng cảm ơn Quý công ty.",
      { height: 66 }
    );
    r++;

    // --- Khối ký tên, đóng dấu (cột E:G) ---
    const sig = (text: string, opts: { bold?: boolean; italic?: boolean; height?: number } = {}) => {
      ws.mergeCells(r, 5, r, 7);
      const c = ws.getCell(r, 5);
      c.value = text;
      c.font = { name: FONT, size: 12, bold: !!opts.bold, italic: !!opts.italic };
      c.alignment = { horizontal: "center", vertical: "middle" };
      if (opts.height) ws.getRow(r).height = opts.height;
      r++;
    };
    sig("CHỦ HỘ KINH DOANH", { bold: true, height: 20 });
    sig("(Ký, ghi rõ họ tên, đóng dấu)", { italic: true, height: 18 });
    const imgRow = r - 1; // chỉ số dòng bắt đầu (tính từ 0) của vùng chứa ảnh
    for (let k = 0; k < 5; k++) {
      ws.getRow(r).height = 22;
      r++;
    }
    sig(HKD_INFO.signer, { bold: true, height: 20 });

    if (stampId !== null) {
      ws.addImage(stampId, { tl: { col: 4.1, row: imgRow + 0.1 }, ext: { width: 200, height: 85 } });
    }
    if (signId !== null) {
      ws.addImage(signId, { tl: { col: 5.2, row: imgRow + 1.3 }, ext: { width: 130, height: 60 } });
    }
  }

  if (sheets === 0) return 0;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return sheets;
}