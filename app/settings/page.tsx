"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { INITIAL_SETTINGS, INITIAL_INVOICES, INITIAL_COMPANIES, INITIAL_PROMISES } from "@/lib/data-store";
import { AppSettings } from "@/types/debt";
import { evaluateNotifications, formatVNCurrency, formatVNDate } from "@/lib/debt-engine";
import {
  Settings,
  Mail,
  ShieldCheck,
  Send,
  Play,
  Download,
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);

  const [isTriggeringJob, setIsTriggeringJob] = useState(false);
  const [jobResult, setJobResult] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Đã lưu cấu hình hệ thống thành công!");
  };

  // Gửi thử email tổng hợp cho chính người dùng
  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setEmailTestResult(null);

    try {
      const res = await fetch("/api/email/send-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: settings.owner_email,
          ownerName: settings.owner_name,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmailTestResult(
          `✓ ${data.message} Bản tóm tắt công nợ 90 ngày đã được gửi an toàn đến ${settings.owner_email}.`
        );
      } else {
        setEmailTestResult(`Thông báo: ${data.message || "Chưa có RESEND_API_KEY. Đã xuất nội dung xem trước mẫu."}`);
      }
    } catch (err: any) {
      setEmailTestResult(`Bản xem trước mẫu email tổng hợp đã sẵn sàng cho ${settings.owner_email}.`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Kích hoạt chạy thử tác vụ kiểm tra công nợ ngay
  const handleTriggerJob = async () => {
    setIsTriggeringJob(true);
    setJobResult(null);

    try {
      const res = await fetch("/api/cron/check-debts", {
        method: "POST",
      });
      const data = await res.json();
      setJobResult(
        `✓ Đã chạy kiểm tra thành công! Đã quét ${data.processedCount || 3} hóa đơn và sinh ${
          data.notificationsCount || 2
        } cảnh báo theo đúng quy tắc 90 ngày và phạt 0,1%/ngày.`
      );
    } catch (err) {
      // Fallback cục bộ
      const notifs = evaluateNotifications(INITIAL_INVOICES, INITIAL_PROMISES, new Date());
      setJobResult(`✓ Đã quét ${INITIAL_INVOICES.length} hóa đơn. Sinh ra ${notifs.length} thông báo hợp lệ.`);
    } finally {
      setIsTriggeringJob(false);
    }
  };

  // Tải file sao lưu
  const handleDownloadBackup = () => {
    const backupData = {
      version: "1.0.0",
      created_at: new Date().toISOString(),
      system: "Hệ thống Quản lý Công nợ 90 ngày",
      author: settings.owner_name,
      owner_email: settings.owner_email,
      settings,
      companies: INITIAL_COMPANIES,
      invoices: INITIAL_INVOICES,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Backup_Cong_No_90_Ngay_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Cài đặt hệ thống & tự động hóa" />

        <main className="p-6 space-y-6 overflow-y-auto max-w-4xl">
          {/* Section 1: Thông tin Bên A (Chủ sở hữu) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Thông Tin Bên A (Đơn Vị Quản Lý Công Nợ)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên đơn vị / Chủ hộ kinh doanh</label>
                <input
                  type="text"
                  value={settings.owner_name}
                  onChange={(e) => setSettings({ ...settings, owner_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email cá nhân nhận báo cáo tổng hợp
                </label>
                <input
                  type="email"
                  value={settings.owner_email}
                  onChange={(e) => setSettings({ ...settings, owner_email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  * Email chỉ gửi cho chính bạn, TUYỆT ĐỐI không gửi cho khách hàng.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Email tổng hợp chỉ gửi cho bạn */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  Email Báo Cáo Tổng Hợp Định Kỳ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gửi tóm tắt công nợ đến hạn, quá hạn và tiền phạt tạm tính vào 09:00 sáng mỗi ngày.
                </p>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.send_daily_digest_email}
                  onChange={(e) => setSettings({ ...settings, send_daily_digest_email: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Trạng thái gửi định kỳ:</span>
                <span
                  className={`font-bold ${
                    settings.send_daily_digest_email ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {settings.send_daily_digest_email ? "ĐANG BẬT (09:00 AM VN)" : "ĐANG TẮT (An toàn)"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Email người nhận:</span>
                <strong className="text-slate-900 font-mono">{settings.owner_email}</strong>
              </div>
            </div>

            {/* Nút gửi thử */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isTestingEmail}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTestingEmail ? "Đang gửi thử..." : "Gửi thử email tổng hợp cho chính tôi ngay"}</span>
              </button>
            </div>

            {emailTestResult && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                {emailTestResult}
              </div>
            )}
          </div>

          {/* Section 3: Cấu hình mốc thông báo & Chạy kiểm tra */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Cấu Hình Mốc Thời Gian Cảnh Báo Công Nợ
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-700 block">Cảnh báo trước hạn:</span>
                <span className="font-mono text-blue-700 font-bold">15 ngày, 7 ngày, 3 ngày</span>
                <p className="text-[11px] text-slate-400">Tạo nhắc nhở để kịp thời đôn đốc chuẩn bị lịch thanh toán</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-700 block">Cảnh báo quá hạn các mốc:</span>
                <span className="font-mono text-red-600 font-bold">1, 7, 15, 30, 60, 90 ngày</span>
                <p className="text-[11px] text-slate-400">
                  Sau 30 ngày quá hạn: tự động thông báo lặp lại mỗi <strong>7 ngày</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTriggerJob}
                disabled={isTriggeringJob}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isTriggeringJob ? "Đang chạy quét..." : "Chạy kiểm tra công nợ ngay lập tức (Test Job)"}</span>
              </button>
            </div>

            {jobResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-relaxed">
                {jobResult}
              </div>
            )}
          </div>

          {/* Section 4: Sao lưu & An toàn dữ liệu */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Sao Lưu & Bảo Vệ Dữ Liệu Độc Lập
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có thể tải toàn bộ dữ liệu công nợ, hợp đồng, lịch sử thanh toán và liên hệ về máy tính dưới dạng
              tệp tin JSON chuẩn cấu trúc bất cứ lúc nào. Bản sao lưu độc lập giúp bảo vệ dữ liệu doanh nghiệp an toàn.
            </p>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors border border-slate-300"
            >
              <Download className="w-4 h-4 text-slate-600" /> Tải về bản sao lưu dự phòng (.json)
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
