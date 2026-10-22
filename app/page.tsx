"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import {
  INITIAL_COMPANIES,
  INITIAL_CONTRACTS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_CONTACTS,
  INITIAL_PROMISES,
} from "@/lib/data-store";
import {
  formatVNCurrency,
  formatVNDate,
  evaluateNotifications,
  calculateDaysOverdue,
  calculateDaysRemaining,
} from "@/lib/debt-engine";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  Building,
  TrendingDown,
  Calendar,
  PhoneForwarded,
  ArrowRight,
  Filter,
} from "lucide-react";

export default function DashboardPage() {
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [companies] = useState(INITIAL_COMPANIES);
  const [promises] = useState(INITIAL_PROMISES);
  const [contacts] = useState(INITIAL_CONTACTS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Đánh giá thông báo tự động tại thời điểm hiện tại
  const generatedNotifications = useMemo(() => {
    return evaluateNotifications(invoices, promises, new Date());
  }, [invoices, promises]);

  // Các chỉ số tài chính tính toán tự động
  const stats = useMemo(() => {
    let totalUncollected = 0;
    let totalOverdue = 0;
    let totalPenalty = 0;
    let countUpcoming = 0;
    let countDueToday = 0;
    let countOverdue = 0;
    let countOver7d = 0;
    let countOver15d = 0;
    let countOver30d = 0;
    let countOver60d = 0;
    let countOver90d = 0;
    let countUncontacted = 0;

    // Doanh số theo từng công ty
    const companyDebts: { [key: string]: { name: string; debt: number; overdue: number; penalty: number } } = {};
    for (const c of companies) {
      companyDebts[c.id] = { name: c.name, debt: 0, overdue: 0, penalty: 0 };
    }

    const contactedInvoiceIds = new Set(contacts.map((c) => c.invoice_id));

    for (const inv of invoices) {
      const remaining = inv.remaining_balance;
      totalUncollected += remaining;

      if (companyDebts[inv.company_id]) {
        companyDebts[inv.company_id].debt += remaining;
      }

      if (remaining > 0 && !inv.is_paused) {
        if (!contactedInvoiceIds.has(inv.id)) {
          countUncontacted++;
        }

        const effectiveDue = inv.extended_due_date || inv.due_date;
        if (effectiveDue) {
          const daysRem = calculateDaysRemaining(effectiveDue);
          const daysOver = calculateDaysOverdue(effectiveDue);

          if (daysRem > 0 && daysRem <= 15) countUpcoming++;
          if (daysRem === 0) countDueToday++;

          if (daysOver > 0) {
            countOverdue++;
            totalOverdue += remaining;
            totalPenalty += inv.estimated_penalty || 0;
            if (companyDebts[inv.company_id]) {
              companyDebts[inv.company_id].overdue += remaining;
              companyDebts[inv.company_id].penalty += inv.estimated_penalty || 0;
            }

            if (daysOver > 7) countOver7d++;
            if (daysOver > 15) countOver15d++;
            if (daysOver > 30) countOver30d++;
            if (daysOver > 60) countOver60d++;
            if (daysOver > 90) countOver90d++;
          }
        }
      }
    }

    const countPendingPromises = promises.filter((p) => p.status === "pending").length;

    return {
      totalUncollected,
      totalOverdue,
      totalPenalty,
      countUpcoming,
      countDueToday,
      countOverdue,
      countOver7d,
      countOver15d,
      countOver30d,
      countOver60d,
      countOver90d,
      countUncontacted,
      countPendingPromises,
      companyDebts,
    };
  }, [invoices, companies, contacts, promises]);

  // Bộ lọc danh sách hóa đơn theo chỉ số nhấp chuột
  const filteredInvoices = useMemo(() => {
    if (selectedFilter === "all") return invoices;
    if (selectedFilter === "upcoming") {
      return invoices.filter((i) => {
        const d = i.extended_due_date || i.due_date;
        return d && calculateDaysRemaining(d) > 0 && calculateDaysRemaining(d) <= 15 && i.remaining_balance > 0;
      });
    }
    if (selectedFilter === "due_today") {
      return invoices.filter((i) => {
        const d = i.extended_due_date || i.due_date;
        return d && calculateDaysRemaining(d) === 0 && i.remaining_balance > 0;
      });
    }
    if (selectedFilter === "overdue") {
      return invoices.filter((i) => i.days_overdue > 0 && i.remaining_balance > 0);
    }
    if (selectedFilter === "overdue_30d") {
      return invoices.filter((i) => i.days_overdue > 30 && i.remaining_balance > 0);
    }
    if (selectedFilter === "uncontacted") {
      const contactedInvoiceIds = new Set(contacts.map((c) => c.invoice_id));
      return invoices.filter((i) => !contactedInvoiceIds.has(i.id) && i.remaining_balance > 0);
    }
    if (selectedFilter === "paid") {
      return invoices.filter((i) => i.remaining_balance <= 0);
    }
    return invoices;
  }, [invoices, selectedFilter, contacts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar unreadNotifsCount={generatedNotifications.length} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Tổng quan công nợ 90 ngày"
          unreadCount={generatedNotifications.length}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Banner thông báo quan trọng */}
          {stats.countOverdue > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">
                    Có {stats.countOverdue} khoản công nợ đã quá hạn! Tổng tiền nợ chậm trả:{" "}
                    {formatVNCurrency(stats.totalOverdue)}
                  </h4>
                  <p className="text-xs text-red-700 mt-1">
                    Tiền phạt chậm trả tạm tính lũy kế (0,1%/ngày):{" "}
                    <strong className="underline">{formatVNCurrency(stats.totalPenalty)}</strong>. Bạn cần chủ động liên
                    hệ kế toán khách hàng để đôn đốc.
                  </p>
                </div>
              </div>
              <Link
                href="/notifications"
                className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1"
              >
                Xem cảnh báo <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* HÀNG 1: CÁC THẺ CHỈ SỐ TÀI CHÍNH CỐT LÕI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tổng công nợ chưa thu */}
            <div
              onClick={() => setSelectedFilter("all")}
              className={`p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${
                selectedFilter === "all" ? "ring-2 ring-blue-500" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Tổng nợ chưa thu</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-xl font-extrabold text-slate-900">
                {formatVNCurrency(stats.totalUncollected)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Toàn bộ các hóa đơn còn số dư</div>
            </div>

            {/* Sắp đến hạn (<= 15 ngày) */}
            <div
              onClick={() => setSelectedFilter("upcoming")}
              className={`p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${
                selectedFilter === "upcoming" ? "ring-2 ring-amber-500" : "border-amber-200 bg-amber-50/20"
              }`}
            >
              <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
                <span>Sắp đến hạn (≤ 15 ngày)</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-xl font-extrabold text-amber-600">
                {stats.countUpcoming} <span className="text-sm font-normal text-slate-500">khoản</span>
              </div>
              <div className="mt-1 text-[11px] text-amber-700">Cần chuẩn bị rà soát hồ sơ</div>
            </div>

            {/* Đến hạn hôm nay */}
            <div
              onClick={() => setSelectedFilter("due_today")}
              className={`p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${
                selectedFilter === "due_today" ? "ring-2 ring-orange-500" : "border-orange-200 bg-orange-50/20"
              }`}
            >
              <div className="flex items-center justify-between text-orange-700 text-xs font-medium">
                <span>Đến hạn hôm nay (0 ngày)</span>
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div className="mt-2 text-xl font-extrabold text-orange-600">
                {stats.countDueToday} <span className="text-sm font-normal text-slate-500">khoản</span>
              </div>
              <div className="mt-1 text-[11px] text-orange-700">Kiểm tra ngay sao kê ngân hàng</div>
            </div>

            {/* Quá hạn */}
            <div
              onClick={() => setSelectedFilter("overdue")}
              className={`p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${
                selectedFilter === "overdue" ? "ring-2 ring-red-500" : "border-red-200 bg-red-50/20"
              }`}
            >
              <div className="flex items-center justify-between text-red-700 text-xs font-medium">
                <span>Tổng nợ quá hạn</span>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="mt-2 text-xl font-extrabold text-red-600">
                {formatVNCurrency(stats.totalOverdue)}
              </div>
              <div className="mt-1 text-[11px] text-red-600 font-medium">
                {stats.countOverdue} khoản nợ chậm thanh toán
              </div>
            </div>
          </div>

          {/* HÀNG 2: PHÂN TÍCH TUỔI NỢ (AGING BUCKETS) & TIỀN PHẠT TẠM TÍNH */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Phân nhóm quá hạn */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-slate-600" />
                  Phân Loại Tuổi Nợ Quá Hạn Theo Nhóm Ngày
                </h3>
                <span className="text-xs text-slate-400">Điều khoản 90 ngày</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">&gt; 7 ngày</div>
                  <div className="text-lg font-bold text-amber-700 mt-1">{stats.countOver7d}</div>
                  <div className="text-[10px] text-slate-400">Vừa quá hạn</div>
                </div>

                <div className="p-3 rounded-lg bg-orange-50/50 border border-orange-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">&gt; 15 ngày</div>
                  <div className="text-lg font-bold text-orange-700 mt-1">{stats.countOver15d}</div>
                  <div className="text-[10px] text-slate-400">Nhắc lần 2</div>
                </div>

                <div
                  onClick={() => setSelectedFilter("overdue_30d")}
                  className="p-3 rounded-lg bg-red-50/70 border border-red-300 text-center cursor-pointer hover:bg-red-100 transition-colors"
                >
                  <div className="text-xs text-red-700 font-bold">&gt; 30 ngày</div>
                  <div className="text-lg font-bold text-red-700 mt-1">{stats.countOver30d}</div>
                  <div className="text-[10px] text-red-600 font-medium">Nhắc mỗi 7 ngày</div>
                </div>

                <div className="p-3 rounded-lg bg-red-100/60 border border-red-400 text-center">
                  <div className="text-xs text-red-800 font-medium">&gt; 60 ngày</div>
                  <div className="text-lg font-bold text-red-800 mt-1">{stats.countOver60d}</div>
                  <div className="text-[10px] text-slate-500">Ưu tiên xử lý</div>
                </div>

                <div className="p-3 rounded-lg bg-rose-100 border border-rose-500 text-center">
                  <div className="text-xs text-rose-900 font-bold">&gt; 90 ngày</div>
                  <div className="text-lg font-bold text-rose-900 mt-1">{stats.countOver90d}</div>
                  <div className="text-[10px] text-rose-700 font-bold">Nghiêm trọng</div>
                </div>
              </div>

              {/* Thông tin đôn đốc */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
                <div className="flex items-center gap-2">
                  <PhoneForwarded className="w-4 h-4 text-blue-600" />
                  <span>
                    Chưa liên hệ đôn đốc: <strong>{stats.countUncontacted}</strong> khoản nợ
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>
                    Khách hẹn trả: <strong>{stats.countPendingPromises}</strong> lịch hẹn đang chờ
                  </span>
                </div>
                <Link href="/contacts" className="text-blue-600 hover:underline font-medium">
                  Quản lý nhật ký liên hệ &rarr;
                </Link>
              </div>
            </div>

            {/* Chi tiết phạt chậm trả tạm tính */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-slate-800">Tiền Phạt Chậm Trả</h3>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded">
                    0,1%/ngày
                  </span>
                </div>
                <p className="text-xs text-slate-500">Căn cứ: Số dư gốc chậm thanh toán theo hợp đồng</p>

                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white">
                  <div className="text-xs text-slate-400">Tổng tiền phạt tạm tính đối chiếu:</div>
                  <div className="text-2xl font-extrabold text-amber-400 mt-1">
                    {formatVNCurrency(stats.totalPenalty)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                    * Khoản phạt chỉ là số tiền tạm tính để đối chiếu, cần rà soát theo hợp đồng trước khi yêu cầu khách thanh toán. Không cộng gộp vào gốc hóa đơn.
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Công thức: <code>Gốc chậm × 0.1% × Số ngày chậm</code>
              </div>
            </div>
          </div>

          {/* HÀNG 3: CÔNG NỢ CHI TIẾT THEO TỪNG CÔNG TY */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-600" />
              Công Nợ Theo Từng Khách Hàng
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(stats.companyDebts).map(([cid, comp]) => (
                <div key={cid} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{comp.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Khách hàng hợp đồng nguyên tắc 90 ngày</p>
                    </div>
                    <Link
                      href={`/companies`}
                      className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                    >
                      Hồ sơ &rarr;
                    </Link>
                  </div>

                  <div className="pt-2 grid grid-cols-3 gap-2 text-xs border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Còn nợ:</span>
                      <span className="font-bold text-slate-800">{formatVNCurrency(comp.debt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Quá hạn:</span>
                      <span className={`font-bold ${comp.overdue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatVNCurrency(comp.overdue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phạt tạm tính:</span>
                      <span className="font-bold text-amber-600">{formatVNCurrency(comp.penalty)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HÀNG 4: DANH SÁCH HÓA ĐƠN VÀ CÔNG NỢ THỰC TẾ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-sm text-slate-800">
                  Danh Sách Hóa Đơn ({filteredInvoices.length})
                </h3>
              </div>

              {/* Tabs Lọc */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {[
                  { id: "all", label: "Tất cả" },
                  { id: "upcoming", label: "Sắp đến hạn" },
                  { id: "due_today", label: "Đến hạn hôm nay" },
                  { id: "overdue", label: "Quá hạn" },
                  { id: "overdue_30d", label: "> 30 ngày" },
                  { id: "paid", label: "Đã trả xong" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      selectedFilter === tab.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bảng dữ liệu hóa đơn */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Khách hàng / Hợp đồng</th>
                    <th className="px-4 py-3">Số HĐ / Ký hiệu</th>
                    <th className="px-4 py-3">Ngày bắt đầu 90 ngày</th>
                    <th className="px-4 py-3">Hạn thanh toán</th>
                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                    <th className="px-4 py-3 text-right">Dư nợ còn lại</th>
                    <th className="px-4 py-3 text-center">Quá hạn</th>
                    <th className="px-4 py-3 text-right">Phạt 0.1%/ngày</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        Không có hóa đơn nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const effectiveDue = inv.extended_due_date || inv.due_date;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{inv.company_name}</div>
                            <div className="text-[11px] text-slate-500">
                              {inv.contract_number || "Theo đơn hàng"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-slate-800">Số {inv.invoice_number}</span>
                            {inv.invoice_serial && (
                              <span className="block text-[10px] text-slate-400">Ký hiệu {inv.invoice_serial}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {inv.confirmed_start_date ? (
                              <span className="text-slate-700">{formatVNDate(inv.confirmed_start_date)}</span>
                            ) : (
                              <span className="text-red-500 font-semibold italic">Chưa xác nhận</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {effectiveDue ? (
                              <span className="font-semibold text-slate-800">{formatVNDate(effectiveDue)}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {formatVNCurrency(inv.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-bold ${
                                inv.remaining_balance > 0 ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {formatVNCurrency(inv.remaining_balance)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {inv.days_overdue > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                                {inv.days_overdue} ngày
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-amber-600">
                            {formatVNCurrency(inv.estimated_penalty || 0)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={`/invoices`}
                                className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded"
                              >
                                Xem
                              </Link>
                              <Link
                                href={`/payments`}
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                Trả tiền
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "fully_paid":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> Đã thanh toán
        </span>
      );
    case "partially_paid":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
          Trả một phần
        </span>
      );
    case "overdue":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 animate-pulse">
          Quá hạn
        </span>
      );
    case "due_today":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800">
          Hôm nay
        </span>
      );
    case "upcoming_due":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
          Sắp đến hạn
        </span>
      );
    case "not_due_yet":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
          Trong hạn
        </span>
      );
    case "incomplete_dossier":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 text-gray-800">
          Thiếu hồ sơ
        </span>
      );
    case "paused":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
          Tạm dừng
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}
