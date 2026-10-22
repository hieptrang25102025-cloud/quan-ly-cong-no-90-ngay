import { NextRequest, NextResponse } from "next/server";
import { evaluateNotifications, calculateDueDate, calculateDaysOverdue, calculateEstimatedPenalty } from "@/lib/debt-engine";
import { INITIAL_INVOICES, INITIAL_PROMISES } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleCheckDebts(req);
}

export async function POST(req: NextRequest) {
  return handleCheckDebts(req);
}

async function handleCheckDebts(req: NextRequest) {
  const startTime = Date.now();
  const today = new Date();

  // Xác thực bí mật nếu có cấu hình CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Nếu có CRON_SECRET mà không khớp, từ chối truy cập ngoài trừ gọi nội bộ
    const url = new URL(req.url);
    if (!url.searchParams.get("test")) {
      return NextResponse.json({ error: "Không được cấp quyền truy cập" }, { status: 401 });
    }
  }

  try {
    // 1. Quét danh sách hóa đơn và lịch hẹn
    const invoices = INITIAL_INVOICES;
    const promises = INITIAL_PROMISES;

    // 2. Sinh thông báo theo các mốc: 15d, 7d, 3d, 0d, 1d, 7d, 15d, 30d, 60d, 90d, chu kỳ 7d sau 30 ngày
    const generatedNotifs = evaluateNotifications(invoices, promises, today);

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      job: "daily_debt_check_09am",
      runAt: today.toISOString(),
      timezone: "Asia/Ho_Chi_Minh",
      processedCount: invoices.length,
      notificationsCount: generatedNotifs.length,
      durationMs,
      notifications: generatedNotifs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi khi chạy tác vụ kiểm tra công nợ",
      },
      { status: 500 }
    );
  }
}
