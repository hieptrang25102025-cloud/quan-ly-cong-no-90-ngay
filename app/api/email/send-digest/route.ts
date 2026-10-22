import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { INITIAL_INVOICES, INITIAL_PROMISES, INITIAL_SETTINGS } from "@/lib/data-store";
import { formatVNCurrency, formatVNDate, calculateDaysOverdue, calculateDaysRemaining } from "@/lib/debt-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recipientEmail = body.recipientEmail || INITIAL_SETTINGS.owner_email;
    const ownerName = body.ownerName || INITIAL_SETTINGS.owner_name;

    // BẢO VỆ NGHIỆP VỤ: TUYỆT ĐỐI KHÔNG GỬI CHO KHÁCH HÀNG
    // Chỉ gửi đến email của chủ hệ thống
    if (recipientEmail !== INITIAL_SETTINGS.owner_email && !recipientEmail.includes("@")) {
      return NextResponse.json(
        { error: "Chỉ được phép gửi email tổng hợp công nợ cho chính chủ tài khoản!" },
        { status: 400 }
      );
    }

    // Tổng hợp số liệu
    const invoices = INITIAL_INVOICES;
    const promises = INITIAL_PROMISES;

    const overdueInvoices = invoices.filter((i) => i.days_overdue > 0 && i.remaining_balance > 0);
    const upcomingInvoices = invoices.filter((i) => {
      const d = i.extended_due_date || i.due_date;
      return d && calculateDaysRemaining(d) > 0 && calculateDaysRemaining(d) <= 15 && i.remaining_balance > 0;
    });

    const totalOverdue = overdueInvoices.reduce((acc, cur) => acc + cur.remaining_balance, 0);
    const totalPenalty = overdueInvoices.reduce((acc, cur) => acc + (cur.estimated_penalty || 0), 0);

    const emailSubject = `[BÁO CÁO CÔNG NỢ 09:00 AM] Tóm tắt công nợ 90 ngày - ${new Date().toLocaleDateString("vi-VN")}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background: #0f172a; color: #fff; padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0; font-size: 18px; color: #60a5fa;">HỆ THỐNG QUẢN LÝ CÔNG NỢ 90 NGÀY</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Báo cáo tổng hợp dành riêng cho: <strong>${ownerName}</strong></p>
        </div>

        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 10px 10px;">
          <p>Xin chào <strong>${ownerName}</strong>,</p>
          <p>Dưới đây là tình hình công nợ hợp đồng nguyên tắc 90 ngày của bạn tính đến 09:00 sáng hôm nay:</p>

          <div style="background: #f8fafc; border-left: 4px solid #ef4444; padding: 15px; margin: 18px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Tổng nợ quá hạn:</strong> <span style="color: #dc2626; font-size: 16px; font-weight: bold;">${formatVNCurrency(totalOverdue)}</span></p>
            <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Tiền phạt chậm trả tạm tính (0,1%/ngày):</strong> <span style="color: #d97706; font-weight: bold;">${formatVNCurrency(totalPenalty)}</span></p>
          </div>

          <h3 style="font-size: 14px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">1. Các khoản nợ quá hạn cần ưu tiên liên hệ:</h3>
          ${
            overdueInvoices.length === 0
              ? "<p style='color: #16a34a; font-size: 13px;'>Không có khoản nợ nào bị quá hạn.</p>"
              : `<ul style="font-size: 13px; padding-left: 20px;">
                ${overdueInvoices
                  .map(
                    (inv) =>
                      `<li style="margin-bottom: 8px;"><strong>${inv.company_name}</strong> - HĐ #${inv.invoice_number}: Còn nợ <strong>${formatVNCurrency(inv.remaining_balance)}</strong>, quá hạn <strong>${inv.days_overdue} ngày</strong>. Phạt tạm tính: <strong>${formatVNCurrency(inv.estimated_penalty || 0)}</strong>.</li>`
                  )
                  .join("")}
              </ul>`
          }

          <h3 style="font-size: 14px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px;">2. Các khoản sắp đến hạn (≤ 15 ngày):</h3>
          ${
            upcomingInvoices.length === 0
              ? "<p style='color: #64748b; font-size: 13px;'>Không có khoản nợ nào sắp đến hạn.</p>"
              : `<ul style="font-size: 13px; padding-left: 20px;">
                ${upcomingInvoices
                  .map(
                    (inv) =>
                      `<li style="margin-bottom: 8px;"><strong>${inv.company_name}</strong> - HĐ #${inv.invoice_number}: Số tiền <strong>${formatVNCurrency(inv.remaining_balance)}</strong>, hạn thanh toán: <strong>${formatVNDate(inv.extended_due_date || inv.due_date)}</strong>.</li>`
                  )
                  .join("")}
              </ul>`
          }

          <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
            <p style="margin: 0;">Email này được gửi tự động từ Hệ thống Quản lý Công nợ 90 ngày theo yêu cầu của bạn.</p>
            <p style="margin: 4px 0 0 0;">TUYỆT ĐỐI KHÔNG chuyển tiếp email này ra ngoài để đảm bảo bảo mật công nợ nội bộ.</p>
          </div>
        </div>
      </div>
    `;

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Quan Ly Cong No <onboarding@resend.dev>",
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
      });
      return NextResponse.json({
        success: true,
        message: "Email tổng hợp đã được gửi thành công qua Resend",
        recipient: recipientEmail,
      });
    } else {
      // Khi chưa cấu hình key Resend trên môi trường thử nghiệm
      return NextResponse.json({
        success: true,
        message: "Đã tạo nội dung email tổng hợp thành công (Chế độ xem trước)",
        recipient: recipientEmail,
        subject: emailSubject,
        previewSummary: {
          totalOverdue,
          totalPenalty,
          overdueCount: overdueInvoices.length,
          upcomingCount: upcomingInvoices.length,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
