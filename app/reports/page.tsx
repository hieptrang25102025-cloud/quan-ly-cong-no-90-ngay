"use client";

import { useState, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import {
  INITIAL_COMPANIES,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_CONTACTS,
  INITIAL_PROMISES,
} from "@/lib/data-store";
import { exportDebtReportToExcel } from "@/lib/excel-export";
import { formatVNCurrency, formatVNDate } from "@/lib/debt-engine";
import {
  BarChart3,
  Download,
  Filter,
  FileSpreadsheet,
  Building,
  TrendingDown,
  Clock,
  AlertTriangle,
} from "lucide-react";

export default function ReportsPage() {
  const [invoices] = useState(INITIAL_INVOICES);
  const [companies] = useState(INITIAL_COMPANIES);
  const [payments] = useState(INITIAL_PAYMENTS);
  const [contacts] = useState(INITIAL_CONTACTS);
  const [promises] = useState(INITIAL_PROMISES);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("summary");

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      if (selectedCompanyId !== "all" && i.company_id !== selectedCompanyId) return false;
      return true;
    });
  }, [invoices, selectedCompanyId]);

  const handleExportExcel = () => {
    exportDebtReportToExcel(
      {
        companies,
        invoices: filteredInvoices,
        payments,
        contacts,
        promises,
      },
      `Bao_Cao_Cong_No_90_Ngay_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Báo cáo công nợ & xuất file Excel" />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <Filter className="w-4 h-4 text-blue-600" /> Bộ lọc báo cáo:
              </div>

              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Tất cả khách hàng (Cả 2 công ty)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="summary">1. Báo cáo tổng hợp công nợ 90 ngày</option>
                <option value="overdue">2. Báo cáo nợ quá hạn & tiền phạt 0.1%/ngày</option>
                <option value="aging">3. Báo cáo phân loại tuổi nợ theo nhóm ngày</option>
                <option value="promises">4. Báo cáo danh sách hẹn thanh toán</option>
              </select>
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20"
            >
              <FileSpreadsheet className="w-4 h-4" /> Xuất file Excel (.xlsx)
            </button>
          </div>

          {/* Nội Dung Báo Cáo Hiển Thị Trực Quan */}
          {reportType === "summary" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800">
                  Bảng Tổng Hợp Công Nợ Khách Hàng (Điều khoản 90 ngày)
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Tổng: {filteredInvoices.length} hóa đơn
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">STT</th>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">HĐ / Ký hiệu</th>
                      <th className="px-4 py-3">Mốc tính 90 ngày</th>
                      <th className="px-4 py-3">Hạn thanh toán</th>
                      <th className="px-4 py-3 text-right">Tổng tiền</th>
                      <th className="px-4 py-3 text-right">Đã thanh toán</th>
                      <th className="px-4 py-3 text-right">Dư nợ còn lại</th>
                      <th className="px-4 py-3 text-center">Quá hạn</th>
                      <th className="px-4 py-3 text-right">Phạt 0.1%/ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((inv, idx) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{inv.company_name}</td>
                        <td className="px-4 py-3 font-mono">Số {inv.invoice_number}</td>
                        <td className="px-4 py-3">{formatVNDate(inv.confirmed_start_date)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {formatVNDate(inv.extended_due_date || inv.due_date)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {formatVNCurrency(inv.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatVNCurrency(inv.paid_amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          {formatVNCurrency(inv.remaining_balance)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {inv.days_overdue > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                              {inv.days_overdue} ngày
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-600">
                          {formatVNCurrency(inv.estimated_penalty || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportType === "overdue" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-red-50/50 flex items-center justify-between">
                <h3 className="font-bold text-sm text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Báo Cáo Chi Tiết Khoản Nợ Quá Hạn & Tiền Phạt Chậm Trả (0,1%/ngày)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Số HĐ</th>
                      <th className="px-4 py-3">Hạn thanh toán</th>
                      <th className="px-4 py-3 text-right">Dư nợ chậm trả</th>
                      <th className="px-4 py-3 text-center">Số ngày chậm</th>
                      <th className="px-4 py-3 text-center">Mức phạt/ngày</th>
                      <th className="px-4 py-3 text-right">Tiền phạt tạm tính</th>
                      <th className="px-4 py-3">Ghi chú đôn đốc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices
                      .filter((i) => i.days_overdue > 0 && i.remaining_balance > 0)
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900">{inv.company_name}</td>
                          <td className="px-4 py-3 font-mono">#{inv.invoice_number}</td>
                          <td className="px-4 py-3">{formatVNDate(inv.extended_due_date || inv.due_date)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">
                            {formatVNCurrency(inv.remaining_balance)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">
                              {inv.days_overdue} ngày
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono">0,1%</td>
                          <td className="px-4 py-3 text-right font-extrabold text-amber-600 font-mono">
                            {formatVNCurrency(inv.estimated_penalty || 0)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-[11px]">{inv.notes || "-"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportType === "promises" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-emerald-50/50 flex items-center justify-between">
                <h3 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Danh Sách Khách Hàng Cam Kết Hẹn Ngày Thanh Toán
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Hóa đơn</th>
                      <th className="px-4 py-3">Ngày hẹn thanh toán</th>
                      <th className="px-4 py-3 text-right">Số tiền hẹn trả</th>
                      <th className="px-4 py-3 text-center">Trạng thái hẹn</th>
                      <th className="px-4 py-3">Ghi chú cam kết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {promises.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{p.company_name}</td>
                        <td className="px-4 py-3 font-mono">HĐ #{p.invoice_number}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{formatVNDate(p.promised_date)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          {p.promised_amount ? formatVNCurrency(p.promised_amount) : "Toàn bộ số dư"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Đang chờ đến ngày
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
