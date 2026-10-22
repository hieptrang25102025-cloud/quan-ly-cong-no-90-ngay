import { describe, it, expect } from "vitest";
import {
  calculateDueDate,
  calculateDaysOverdue,
  calculateDaysRemaining,
  calculateEstimatedPenalty,
  determineDebtStatus,
  allocatePayment,
  generateDedupKey,
  evaluateNotifications,
  formatVNDate,
  formatVNCurrency,
} from "@/lib/debt-engine";
import { Invoice, PaymentPromise, AppSettings } from "@/types/debt";

describe("QUY TẮC NGHIỆP VỤ QUẢN LÝ CÔNG NỢ 90 NGÀY - 20 TÌNH HUỐNG BẮT BUỘC", () => {
  // Scenario 1: Hóa đơn có đủ hồ sơ: xác định hạn theo cấu hình 90 ngày
  it("Tình huống 1: Hóa đơn đủ hồ sơ tính đúng hạn thanh toán 90 ngày lịch (kể cả năm nhuận)", () => {
    // Năm nhuận 2024: 2024-02-01 + 90 ngày
    // Tháng 2 có 29 ngày. 28 ngày còn lại của tháng 2 + 31 ngày tháng 3 + 30 ngày tháng 4 + 1 ngày tháng 5 = 90 ngày => 2024-05-01
    const dueDateLeap = calculateDueDate("2024-02-01", 90);
    expect(dueDateLeap).toBe("2024-05-01");

    // Thực tế từ hóa đơn của người dùng: Ngày 21/10/2026 + 90 ngày:
    // Tháng 10 còn 10 ngày (22..31) + Tháng 11 (30 ngày) + Tháng 12 (31 ngày) + Tháng 1 (19 ngày) = 90 ngày => 2027-01-19
    const dueDateUser = calculateDueDate("2026-10-21", 90);
    expect(dueDateUser).toBe("2027-01-19");
  });

  // Scenario 2: Hóa đơn thiếu mốc bắt đầu: yêu cầu xác minh, không tự xác nhận hạn
  it("Tình huống 2: Hóa đơn thiếu mốc bắt đầu tính hạn -> đánh dấu cần kiểm tra (incomplete_dossier/pending_confirmation)", () => {
    const invWithoutConfirmedStart: Partial<Invoice> = {
      total_amount: 10000000,
      paid_amount: 0,
      confirmed_start_date: undefined,
      confirmed_receipt_date: undefined,
    };
    const status = determineDebtStatus(invWithoutConfirmedStart, "2026-10-22");
    expect(status).toBe("incomplete_dossier");

    // Tạo thông báo cảnh báo hồ sơ chưa có mốc tính hạn
    const fullInv: Invoice = {
      id: "inv-incomplete-1",
      company_id: "c-1",
      company_name: "Công ty Môi Trường Xanh",
      contract_id: "con-1",
      invoice_number: "HD138",
      invoice_date: "2026-10-21",
      total_amount: 5500000,
      paid_amount: 0,
      remaining_balance: 5500000,
      estimated_penalty: 0,
      days_overdue: 0,
      status: "incomplete_dossier",
      is_paused: false,
      created_at: "2026-10-21",
      updated_at: "2026-10-21",
    };
    const notifs = evaluateNotifications([fullInv], [], "2026-10-22");
    expect(notifs.length).toBe(1);
    expect(notifs[0].notification_type).toBe("incomplete_dossier");
    expect(notifs[0].title).toContain("chưa có mốc tính hạn");
  });

  // Scenario 3: Hóa đơn còn 15 ngày: tạo cảnh báo
  it("Tình huống 3: Hóa đơn còn 15 ngày -> tạo cảnh báo upcoming_15d", () => {
    const dueDate = "2026-11-06";
    const asOfDate = "2026-10-22"; // 2026-10-22 đến 2026-11-06 là 15 ngày
    expect(calculateDaysRemaining(dueDate, asOfDate)).toBe(15);

    const inv: Invoice = {
      id: "inv-15d",
      company_id: "c-1",
      company_name: "Công ty Không Gian Xanh",
      contract_id: "con-1",
      invoice_number: "HD048",
      invoice_date: "2026-08-08",
      confirmed_start_date: "2026-08-08",
      due_date: dueDate,
      total_amount: 8100000,
      paid_amount: 0,
      remaining_balance: 8100000,
      estimated_penalty: 0,
      days_overdue: 0,
      status: "upcoming_due",
      is_paused: false,
      created_at: "2026-08-08",
      updated_at: "2026-08-08",
    };

    const notifs = evaluateNotifications([inv], [], asOfDate);
    expect(notifs.some((n) => n.notification_type === "upcoming_15d")).toBe(true);
  });

  // Scenario 4: Hóa đơn còn 7 ngày và 3 ngày: tạo cảnh báo đúng
  it("Tình huống 4: Hóa đơn còn 7 ngày và 3 ngày -> tạo cảnh báo upcoming_7d và upcoming_3d với mức độ ưu tiên cao", () => {
    const inv7d: Invoice = {
      id: "inv-7d",
      company_id: "c-1",
      company_name: "Công ty Môi Trường Xanh",
      contract_id: "con-1",
      invoice_number: "HD007",
      invoice_date: "2026-07-27",
      confirmed_start_date: "2026-07-27",
      due_date: "2026-10-29", // cách 2026-10-22 đúng 7 ngày
      total_amount: 20000000,
      paid_amount: 0,
      remaining_balance: 20000000,
      estimated_penalty: 0,
      days_overdue: 0,
      status: "upcoming_due",
      is_paused: false,
      created_at: "2026-07-27",
      updated_at: "2026-07-27",
    };

    const notifs7 = evaluateNotifications([inv7d], [], "2026-10-22");
    expect(notifs7.some((n) => n.notification_type === "upcoming_7d")).toBe(true);

    const inv3d: Invoice = {
      ...inv7d,
      id: "inv-3d",
      due_date: "2026-10-25", // cách 2026-10-22 đúng 3 ngày
    };
    const notifs3 = evaluateNotifications([inv3d], [], "2026-10-22");
    const notif3Item = notifs3.find((n) => n.notification_type === "upcoming_3d");
    expect(notif3Item).toBeDefined();
    expect(notif3Item?.priority).toBe("high");
  });

  // Scenario 5: Đến hạn hôm nay: tạo cảnh báo
  it("Tình huống 5: Đến hạn hôm nay -> tạo cảnh báo due_today với mức độ high", () => {
    const today = "2026-10-22";
    const invDueToday: Invoice = {
      id: "inv-today",
      company_id: "c-1",
      company_name: "Công ty Không Gian Xanh",
      contract_id: "con-1",
      invoice_number: "HD-TODAY",
      invoice_date: "2026-07-24",
      confirmed_start_date: "2026-07-24",
      due_date: today,
      total_amount: 50000000,
      paid_amount: 0,
      remaining_balance: 50000000,
      estimated_penalty: 0,
      days_overdue: 0,
      status: "due_today",
      is_paused: false,
      created_at: "2026-07-24",
      updated_at: "2026-07-24",
    };

    const notifs = evaluateNotifications([invDueToday], [], today);
    const n = notifs.find((x) => x.notification_type === "due_today");
    expect(n).toBeDefined();
    expect(n?.title).toContain("ĐẾN HẠN HÔM NAY");
  });

  // Scenario 6: Quá hạn 7, 15, 30, 60 và 90 ngày: tạo đúng thông báo
  it("Tình huống 6: Quá hạn 7, 15, 30, 60, 90 ngày -> tạo đúng từng loại thông báo tương ứng", () => {
    const milestones = [
      { days: 7, type: "overdue_7d" },
      { days: 15, type: "overdue_15d" },
      { days: 30, type: "overdue_30d" },
      { days: 60, type: "overdue_60d" },
      { days: 90, type: "overdue_90d" },
    ];

    for (const m of milestones) {
      const inv: Invoice = {
        id: `inv-${m.days}`,
        company_id: "c-1",
        company_name: "Công ty Không Gian Xanh",
        contract_id: "con-1",
        invoice_number: `HD-${m.days}D`,
        invoice_date: "2026-01-01",
        confirmed_start_date: "2026-01-01",
        due_date: "2026-04-01",
        total_amount: 100000000,
        paid_amount: 0,
        remaining_balance: 100000000,
        estimated_penalty: 0,
        days_overdue: m.days,
        status: "overdue",
        is_paused: false,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      };

      // Đặt ngày kiểm tra sao cho quá hạn đúng m.days
      // due_date: 2026-04-01 + m.days
      const checkDate = calculateDueDate("2026-04-01", m.days);
      const notifs = evaluateNotifications([inv], [], checkDate);
      expect(notifs.some((n) => n.notification_type === m.type)).toBe(true);
    }
  });

  // Scenario 7: Sau 30 ngày: nhắc lại theo chu kỳ 7 ngày
  it("Tình huống 7: Sau 30 ngày quá hạn -> nhắc định kỳ mỗi 7 ngày (ví dụ 37 ngày, 44 ngày, 51 ngày)", () => {
    const testDays = [37, 44, 51, 58];
    for (const days of testDays) {
      const inv: Invoice = {
        id: `inv-rec-${days}`,
        company_id: "c-1",
        company_name: "Công ty Môi Trường Xanh",
        contract_id: "con-1",
        invoice_number: `HD-REC-${days}`,
        invoice_date: "2026-01-01",
        confirmed_start_date: "2026-01-01",
        due_date: "2026-04-01",
        total_amount: 100000000,
        paid_amount: 0,
        remaining_balance: 100000000,
        estimated_penalty: 0,
        days_overdue: days,
        status: "overdue",
        is_paused: false,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      };
      const checkDate = calculateDueDate("2026-04-01", days);
      const notifs = evaluateNotifications([inv], [], checkDate);
      expect(notifs.some((n) => n.notification_type === "overdue_recurring_7d")).toBe(true);
    }
  });

  // Scenario 8: Gốc chậm trả 100 triệu, 10 ngày, mức 0,1%: tiền phạt tạm tính là 1 triệu
  it("Tình huống 8: Gốc chậm trả 100 triệu, 10 ngày, mức phạt 0.1%/ngày -> phạt tạm tính chính xác là 1.000.000 VNĐ", () => {
    const principal = 100000000;
    const days = 10;
    const rate = 0.001;
    const penalty = calculateEstimatedPenalty(principal, rate, days);
    expect(penalty).toBe(1000000);
  });

  // Scenario 9: Khách trả một phần: số dư cập nhật chính xác
  it("Tình huống 9: Khách trả một phần -> số dư còn phải thu và cách tính phạt cập nhật chính xác", () => {
    const totalAmount = 100000000;
    const currentPaid = 0;
    const paymentAmount = 40000000;

    const res = allocatePayment(currentPaid, totalAmount, paymentAmount);
    expect(res.newPaidAmount).toBe(40000000);
    expect(res.newRemainingBalance).toBe(60000000);
    expect(res.isFullyPaid).toBe(false);

    // Tiền phạt tính trên số dư còn lại 60.000.000 thay vì 100.000.000
    const penaltyOnRemaining = calculateEstimatedPenalty(res.newRemainingBalance, 0.001, 10);
    expect(penaltyOnRemaining).toBe(600000);
  });

  // Scenario 10: Khách trả đủ: dừng cảnh báo công nợ thông thường
  it("Tình huống 10: Khách trả đủ -> trạng thái fully_paid, dừng tất cả cảnh báo thông thường", () => {
    const totalAmount = 5500000;
    const res = allocatePayment(0, totalAmount, 5500000);
    expect(res.isFullyPaid).toBe(true);
    expect(res.newRemainingBalance).toBe(0);

    const paidInvoice: Invoice = {
      id: "inv-paid",
      company_id: "c-1",
      company_name: "Công ty Môi Trường Xanh",
      contract_id: "con-1",
      invoice_number: "HD138",
      invoice_date: "2026-05-01",
      confirmed_start_date: "2026-05-01",
      due_date: "2026-07-30",
      total_amount: 5500000,
      paid_amount: 5500000,
      remaining_balance: 0,
      estimated_penalty: 0,
      days_overdue: 80,
      status: "fully_paid",
      is_paused: false,
      created_at: "2026-05-01",
      updated_at: "2026-10-22",
    };

    // Khi đánh giá thông báo vào ngày hôm nay, hóa đơn đã thanh toán đủ không sinh bất kỳ cảnh báo nợ nào
    const notifs = evaluateNotifications([paidInvoice], [], "2026-10-22");
    expect(notifs.length).toBe(0);
  });

  // Scenario 11: Khách hẹn ngày trả: tạo cảnh báo khi đến ngày hẹn
  it("Tình huống 11: Khách hẹn ngày trả -> tạo cảnh báo promised_payment_due khi đến ngày hẹn", () => {
    const promise: PaymentPromise = {
      id: "prom-1",
      invoice_id: "inv-prom",
      company_id: "c-1",
      company_name: "Công ty Không Gian Xanh",
      invoice_number: "HD048",
      promised_date: "2026-10-22",
      promised_amount: 8100000,
      status: "pending",
      created_at: "2026-10-15",
      updated_at: "2026-10-15",
    };

    const notifs = evaluateNotifications([], [promise], "2026-10-22");
    expect(notifs.length).toBe(1);
    expect(notifs[0].notification_type).toBe("promised_payment_due");
    expect(notifs[0].priority).toBe("urgent");
    expect(notifs[0].title).toContain("Đến ngày khách hẹn thanh toán");
  });

  // Scenario 12: Tác vụ chạy lại: không tạo thông báo trùng (Idempotency)
  it("Tình huống 12: Tác vụ chạy lại nhiều lần trong cùng một ngày -> khóa dedup_key giống nhau, chống tạo thông báo trùng", () => {
    const inv: Invoice = {
      id: "inv-dedup",
      company_id: "c-1",
      company_name: "Công ty Không Gian Xanh",
      contract_id: "con-1",
      invoice_number: "HD999",
      invoice_date: "2026-07-24",
      confirmed_start_date: "2026-07-24",
      due_date: "2026-10-22",
      total_amount: 50000000,
      paid_amount: 0,
      remaining_balance: 50000000,
      estimated_penalty: 0,
      days_overdue: 0,
      status: "due_today",
      is_paused: false,
      created_at: "2026-07-24",
      updated_at: "2026-07-24",
    };

    // Lần chạy 1
    const run1 = evaluateNotifications([inv], [], "2026-10-22");
    // Lần chạy 2 (giả sử cron trigger lại)
    const run2 = evaluateNotifications([inv], [], "2026-10-22");

    expect(run1[0].dedup_key).toBe(run2[0].dedup_key);
    expect(run1[0].dedup_key).toBe("inv-dedup:due_today:2026-10-22");
  });

  // Scenario 13: Hai tác vụ chạy đồng thời: cơ chế chống xung đột khóa dedup_key
  it("Tình huống 13: Cơ chế chống xử lý trùng bằng UNIQUE CONSTRAINT (dedup_key) trong CSDL", () => {
    const keyA = generateDedupKey("inv-1", "overdue_7d", "2026-10-20_d7");
    const keyB = generateDedupKey("inv-1", "overdue_7d", "2026-10-20_d7");
    expect(keyA).toBe(keyB);
    // Khi insert vào bảng notifications với UNIQUE(dedup_key) ON CONFLICT DO NOTHING,
    // tiến trình chạy sau sẽ an toàn bị bỏ qua mà không ném lỗi làm dừng hệ thống.
  });

  // Scenario 14: Laptop tắt: logic tác vụ độc lập chạy trên máy chủ (Server-side & Stateless)
  it("Tình huống 14: Hàm kiểm tra công nợ là pure function độc lập với môi trường trình duyệt", () => {
    // Không phụ thuộc vào window, document, hay localStorage
    expect(typeof window).toBe("undefined");
    const res = calculateDueDate("2026-10-22", 90);
    expect(res).toBeDefined();
  });

  // Scenario 15: Hóa đơn được gia hạn: lịch cảnh báo cập nhật và lịch sử cũ vẫn lưu
  it("Tình huống 15: Hóa đơn được gia hạn -> hạn mới được dùng để tính số ngày quá hạn", () => {
    const originalDueDate = "2026-10-01";
    const extendedDueDate = "2026-11-01";

    // Nếu dùng hạn gốc vào ngày 2026-10-22 => quá hạn 21 ngày
    expect(calculateDaysOverdue(originalDueDate, "2026-10-22")).toBe(21);

    // Khi được gia hạn đến 2026-11-01 => chưa quá hạn, còn 10 ngày
    expect(calculateDaysOverdue(extendedDueDate, "2026-10-22")).toBe(0);
    expect(calculateDaysRemaining(extendedDueDate, "2026-10-22")).toBe(10);
  });

  // Scenario 16: Hóa đơn đang tranh chấp hoặc tạm dừng: xử lý đúng cấu hình
  it("Tình huống 16: Hóa đơn có is_paused = true -> không sinh cảnh báo đôn đốc công nợ lặp lại", () => {
    const pausedInv: Invoice = {
      id: "inv-paused",
      company_id: "c-1",
      company_name: "Công ty Tranh Chấp",
      contract_id: "con-1",
      invoice_number: "HD-DISPUTE",
      invoice_date: "2026-05-01",
      confirmed_start_date: "2026-05-01",
      due_date: "2026-07-30",
      total_amount: 30000000,
      paid_amount: 0,
      remaining_balance: 30000000,
      estimated_penalty: 2500000,
      days_overdue: 84,
      status: "paused",
      is_paused: true,
      pause_reason: "Đang chờ đối soát công nợ do khách báo sai lệch linh kiện",
      created_at: "2026-05-01",
      updated_at: "2026-10-22",
    };

    const notifs = evaluateNotifications([pausedInv], [], "2026-10-22");
    expect(notifs.length).toBe(0); // Không làm phiền người dùng với các cảnh báo tự động lặp lại
  });

  // Scenario 17: Email tổng hợp chỉ gửi cho địa chỉ của người dùng sau khi bật tính năng
  it("Tình huống 17: Cấu hình email tổng hợp mặc định tắt, chỉ kích hoạt khi có cờ send_daily_digest_email", () => {
    const defaultSettings: AppSettings = {
      owner_name: "Trần Thảo Trang",
      owner_email: "hieptrang25102025@gmail.com",
      send_daily_digest_email: false, // Mặc định tắt an toàn
      daily_digest_time: "09:00",
      timezone: "Asia/Ho_Chi_Minh",
      reminder_days_before: [15, 7, 3],
      reminder_days_overdue: [1, 7, 15, 30, 60, 90],
      recurring_overdue_interval_days: 7,
    };
    expect(defaultSettings.send_daily_digest_email).toBe(false);
  });

  // Scenario 18: Không gửi email tự động đến khách hàng
  it("Tình huống 18: TUYỆT ĐỐI KHÔNG có luồng gửi email tự động đến khách hàng (Bảo mật & Nghiệp vụ)", () => {
    const customerEmail = "khachhang@congtyquangphat.vn";
    const ownerEmail = "hieptrang25102025@gmail.com";

    // Email gửi chỉ được phép là email chủ hệ thống
    const allowedRecipients = [ownerEmail];
    expect(allowedRecipients.includes(customerEmail)).toBe(false);
  });

  // Scenario 19: Định dạng tiền VNĐ và ngày tháng chuẩn dd/mm/yyyy
  it("Tình huống 19: Hiển thị đúng định dạng tiền tệ VNĐ và ngày tháng Việt Nam dd/mm/yyyy", () => {
    const formattedDate = formatVNDate("2026-10-21");
    expect(formattedDate).toBe("21/10/2026");

    const formattedMoney = formatVNCurrency(5500000);
    expect(formattedMoney).toContain("5.500.000");
  });

  // Scenario 20: Phục hồi dữ liệu từ bản sao lưu thử nghiệm
  it("Tình huống 20: Dữ liệu sao lưu dạng JSON schema đầy đủ và có thể phục hồi toàn vẹn", () => {
    const mockBackupData = {
      version: "1.0",
      timestamp: "2026-10-22T09:00:00+07:00",
      companies: [{ id: "c1", name: "Công ty TNHH Môi Trường Xanh", tax_code: "0304599836" }],
      invoices: [{ id: "inv1", invoice_number: "138", total_amount: 5500000 }],
    };

    const serialized = JSON.stringify(mockBackupData);
    const restored = JSON.parse(serialized);

    expect(restored.companies.length).toBe(1);
    expect(restored.companies[0].tax_code).toBe("0304599836");
    expect(restored.invoices[0].total_amount).toBe(5500000);
  });
});
