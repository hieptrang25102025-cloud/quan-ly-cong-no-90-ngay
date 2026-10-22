"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import {
  INITIAL_COMPANIES,
  INITIAL_CONTRACTS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
} from "@/lib/data-store";
import { Invoice, DebtStatus } from "@/types/debt";
import {
  formatVNCurrency,
  formatVNDate,
  calculateDueDate,
  calculateDaysOverdue,
  calculateDaysRemaining,
  calculateEstimatedPenalty,
  determineDebtStatus,
} from "@/lib/debt-engine";
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  PauseCircle,
  FileCheck,
  ChevronRight,
  Info,
  Edit,
  ExternalLink,
} from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [companies] = useState(INITIAL_COMPANIES);
  const [contracts] = useState(INITIAL_CONTRACTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form Thêm Hóa đơn mới
  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [contractId, setContractId] = useState(contracts[0]?.id || "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceSerial, setInvoiceSerial] = useState("2C26MAA");
  const [invoiceDate, setInvoiceDate] = useState("2026-10-21");
  const [acceptanceDate, setAcceptanceDate] = useState("2026-10-21");
  const [sentInvoiceDate, setSentInvoiceDate] = useState("2026-10-21");
  const [sentAcceptanceDate, setSentAcceptanceDate] = useState("2026-10-21");
  const [confirmedReceiptDate, setConfirmedReceiptDate] = useState("2026-10-21");
  const [confirmedStartDate, setConfirmedStartDate] = useState("2026-10-21");
  const [totalAmount, setTotalAmount] = useState<number>(5500000);
  const [notes, setNotes] = useState("");

  // Form Gia Hạn
  const [extendedDueDate, setExtendedDueDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number.includes(searchQuery) ||
      (inv.company_name && inv.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.notes && inv.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;
    if (statusFilter === "all") return true;
    return inv.status === statusFilter;
  });

  const openAddModal = () => {
    setCompanyId(companies[0]?.id || "");
    setContractId(contracts[0]?.id || "");
    setInvoiceNumber("");
    setInvoiceSerial("2C26MAA");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setAcceptanceDate(new Date().toISOString().split("T")[0]);
    setSentInvoiceDate(new Date().toISOString().split("T")[0]);
    setSentAcceptanceDate(new Date().toISOString().split("T")[0]);
    setConfirmedReceiptDate(new Date().toISOString().split("T")[0]);
    setConfirmedStartDate(new Date().toISOString().split("T")[0]);
    setTotalAmount(0);
    setNotes("");
    setIsAddModalOpen(true);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || totalAmount <= 0) {
      alert("Vui lòng điền số hóa đơn và tổng số tiền hợp lệ!");
      return;
    }

    const comp = companies.find((c) => c.id === companyId);
    const con = contracts.find((c) => c.id === contractId);

    // Tính hạn 90 ngày nếu có ngày bắt đầu
    const calculatedDue = confirmedStartDate ? calculateDueDate(confirmedStartDate, 90) : "";

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      company_id: companyId,
      company_name: comp?.name || "",
      contract_id: contractId,
      contract_number: con?.contract_number || "",
      invoice_number: invoiceNumber,
      invoice_serial: invoiceSerial,
      invoice_date: invoiceDate,
      acceptance_date: acceptanceDate,
      sent_invoice_date: sentInvoiceDate,
      sent_acceptance_date: sentAcceptanceDate,
      confirmed_receipt_date: confirmedReceiptDate,
      confirmed_start_date: confirmedStartDate,
      due_date: calculatedDue,
      total_amount: Number(totalAmount),
      paid_amount: 0,
      remaining_balance: Number(totalAmount),
      estimated_penalty: 0,
      days_overdue: 0,
      status: confirmedStartDate ? "not_due_yet" : "incomplete_dossier",
      notes,
      is_paused: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setInvoices((prev) => [newInv, ...prev]);
    setIsAddModalOpen(false);
  };

  const handleOpenExtension = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setExtendedDueDate(inv.extended_due_date || inv.due_date || "");
    setExtensionReason(inv.extension_reason || "");
    setIsExtensionModalOpen(true);
  };

  const handleSaveExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !extendedDueDate) return;

    setInvoices((prev) =>
      prev.map((i) =>
        i.id === selectedInvoice.id
          ? {
              ...i,
              extended_due_date: extendedDueDate,
              extension_reason: extensionReason,
              status: "extended",
              days_overdue: calculateDaysOverdue(extendedDueDate),
              estimated_penalty: calculateEstimatedPenalty(
                i.remaining_balance,
                0.001,
                calculateDaysOverdue(extendedDueDate)
              ),
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );

    setIsExtensionModalOpen(false);
  };

  const handleTogglePause = (inv: Invoice) => {
    const nextPaused = !inv.is_paused;
    const reason = nextPaused
      ? prompt("Nhập lý do tạm dừng đôn đốc công nợ (ví dụ: Đang đối chiếu linh kiện, chờ giám đốc duyệt):")
      : "";

    if (nextPaused && !reason) return;

    setInvoices((prev) =>
      prev.map((i) =>
        i.id === inv.id
          ? {
              ...i,
              is_paused: nextPaused,
              pause_reason: reason || undefined,
              status: nextPaused ? "paused" : determineDebtStatus(i),
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Quản lý hóa đơn & theo dõi công nợ 90 ngày" />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm số hóa đơn, khách hàng, biển số xe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="not_due_yet">Chưa đến hạn</option>
                <option value="upcoming_due">Sắp đến hạn (≤ 15 ngày)</option>
                <option value="due_today">Đến hạn hôm nay</option>
                <option value="overdue">Quá hạn</option>
                <option value="partially_paid">Đã trả một phần</option>
                <option value="fully_paid">Đã thanh toán đủ</option>
                <option value="incomplete_dossier">Thiếu hồ sơ</option>
                <option value="extended">Được gia hạn</option>
                <option value="paused">Tạm dừng xử lý</option>
              </select>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm hóa đơn mới
            </button>
          </div>

          {/* Bảng Hóa đơn & Công nợ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Hóa đơn / Ký hiệu</th>
                    <th className="px-4 py-3">Khách hàng</th>
                    <th className="px-4 py-3">Hồ sơ & Mốc tính</th>
                    <th className="px-4 py-3">Hạn thanh toán</th>
                    <th className="px-4 py-3 text-right">Tổng hóa đơn</th>
                    <th className="px-4 py-3 text-right">Số dư còn nợ</th>
                    <th className="px-4 py-3 text-center">Quá hạn</th>
                    <th className="px-4 py-3 text-right">Phạt 0.1%/ngày</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        Không tìm thấy hóa đơn nào.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const effectiveDue = inv.extended_due_date || inv.due_date;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-slate-900 block">Số {inv.invoice_number}</span>
                            <span className="text-[10px] text-slate-400">Ký hiệu {inv.invoice_serial || "2C26MAA"}</span>
                            <span className="text-[10px] text-slate-500 block">
                              Ngày HĐ: {formatVNDate(inv.invoice_date)}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 line-clamp-1">{inv.company_name}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {inv.contract_number || "Theo thỏa thuận"}
                            </div>
                            <div className="text-[10px] text-slate-400 italic line-clamp-1">{inv.notes}</div>
                          </td>

                          <td className="px-4 py-3">
                            {inv.confirmed_start_date ? (
                              <div>
                                <span className="font-medium text-slate-700 block">
                                  Bắt đầu: {formatVNDate(inv.confirmed_start_date)}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-medium">Đã nhận đủ HĐĐT & BBNT</span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-red-500 font-bold block">Thiếu ngày nhận</span>
                                <span className="text-[10px] text-slate-400">Cần xác minh với Bên B</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {effectiveDue ? (
                              <div>
                                <span className="font-bold text-slate-800 block">{formatVNDate(effectiveDue)}</span>
                                {inv.extended_due_date ? (
                                  <span className="text-[10px] text-purple-600 font-semibold">
                                    Đã gia hạn (Gốc: {formatVNDate(inv.due_date)})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">90 ngày lịch</span>
                                )}
                              </div>
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
                            {inv.paid_amount > 0 && (
                              <span className="block text-[10px] text-slate-400">
                                Đã trả: {formatVNCurrency(inv.paid_amount)}
                              </span>
                            )}
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

                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-amber-600 block">
                              {formatVNCurrency(inv.estimated_penalty || 0)}
                            </span>
                            {inv.days_overdue > 0 && (
                              <span className="text-[10px] text-slate-400">
                                {formatVNCurrency(inv.remaining_balance)} × 0.1% × {inv.days_overdue}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={inv.status} />
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setIsDetailModalOpen(true);
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                                title="Xem chi tiết cách tính"
                              >
                                Chi tiết
                              </button>
                              <button
                                onClick={() => handleOpenExtension(inv)}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-semibold"
                                title="Gia hạn thanh toán"
                              >
                                Gia hạn
                              </button>
                              <button
                                onClick={() => handleTogglePause(inv)}
                                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                                  inv.is_paused
                                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                }`}
                                title={inv.is_paused ? "Tiếp tục đôn đốc" : "Tạm dừng nhắc nợ"}
                              >
                                {inv.is_paused ? "Đang dừng" : "Dừng"}
                              </button>
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

          {/* Modal Thêm Hóa đơn mới */}
          {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">Nhập hóa đơn & hồ sơ nghiệm thu mới</h3>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Khách hàng <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Hợp đồng liên quan</label>
                      <select
                        value={contractId}
                        onChange={(e) => setContractId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Không chọn / Thỏa thuận đơn lẻ --</option>
                        {contracts.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.contract_number} ({k.contract_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Số hóa đơn ĐT <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 138"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ký hiệu</label>
                      <input
                        type="text"
                        placeholder="2C26MAA"
                        value={invoiceSerial}
                        onChange={(e) => setInvoiceSerial(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tổng giá trị (VNĐ) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1000}
                        placeholder="5500000"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Phân biệt rõ các mốc ngày */}
                  <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-3">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Quy Tắc Mốc Thời Gian Nghiệp Vụ 90 Ngày
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ngày xuất HĐ</label>
                        <input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="w-full px-2 py-1.5 border rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ngày nghiệm thu</label>
                        <input
                          type="date"
                          value={acceptanceDate}
                          onChange={(e) => setAcceptanceDate(e.target.value)}
                          className="w-full px-2 py-1.5 border rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ngày gửi hồ sơ</label>
                        <input
                          type="date"
                          value={sentInvoiceDate}
                          onChange={(e) => {
                            setSentInvoiceDate(e.target.value);
                            setSentAcceptanceDate(e.target.value);
                          }}
                          className="w-full px-2 py-1.5 border rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Bên B nhận đủ hồ sơ <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={confirmedStartDate}
                          onChange={(e) => {
                            setConfirmedReceiptDate(e.target.value);
                            setConfirmedStartDate(e.target.value);
                          }}
                          className="w-full px-2 py-1.5 border border-blue-400 rounded-lg bg-white font-bold text-blue-700"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      * Theo hợp đồng, hạn thanh toán 90 ngày tính từ ngày Bên B nhận đủ HĐĐT và BBNT hợp lệ.
                      Nếu chưa xác nhận được ngày nhận, để trống để hệ thống đánh dấu "Thiếu hồ sơ/Cần kiểm tra".
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nội dung hàng hóa / Dịch vụ sửa chữa / Ghi chú
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ví dụ: Sửa chữa xe 51D-09944: Cuộn hút van điện từ, bóng đèn valy, công thợ..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                    >
                      Lưu hóa đơn & tính hạn 90 ngày
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Xem Chi Tiết Cách Tính Phạt */}
          {isDetailModalOpen && selectedInvoice && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">
                    Chi tiết công nợ & cách tính phạt HĐ #{selectedInvoice.invoice_number}
                  </h3>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Khách hàng:</span>
                      <strong className="text-slate-900">{selectedInvoice.company_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số hóa đơn:</span>
                      <span className="font-mono font-bold">#{selectedInvoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngày bắt đầu tính hạn:</span>
                      <span>{formatVNDate(selectedInvoice.confirmed_start_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hạn thanh toán 90 ngày:</span>
                      <strong className="text-blue-700">
                        {formatVNDate(selectedInvoice.extended_due_date || selectedInvoice.due_date)}
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                    <h4 className="font-bold text-amber-900">Cơ sở tính tiền phạt chậm trả (0,1%/ngày):</h4>
                    <div className="flex justify-between text-slate-700">
                      <span>1. Tiền gốc chậm trả:</span>
                      <strong className="font-mono">{formatVNCurrency(selectedInvoice.remaining_balance)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>2. Số ngày chậm thanh toán:</span>
                      <strong className="font-mono">{selectedInvoice.days_overdue} ngày</strong>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>3. Mức phạt hợp đồng:</span>
                      <strong className="font-mono">0,1% / ngày (0.001)</strong>
                    </div>
                    <div className="pt-2 border-t border-amber-200 flex justify-between text-sm">
                      <span className="font-bold text-amber-900">Tiền phạt tạm tính:</span>
                      <span className="font-bold text-red-600">
                        {formatVNCurrency(selectedInvoice.estimated_penalty || 0)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic leading-relaxed">
                    * Lưu ý: Tiền phạt chỉ là số tiền tạm tính nội bộ để đối chiếu đôn đốc, không tự động cộng vào
                    tiền gốc hóa đơn và chưa phải yêu cầu thu phạt chính thức cho đến khi thống nhất với khách hàng.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Gia Hạn */}
          {isExtensionModalOpen && selectedInvoice && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">
                    Gia hạn thanh toán HĐ #{selectedInvoice.invoice_number}
                  </h3>
                  <button
                    onClick={() => setIsExtensionModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSaveExtension} className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
                    <p>Hạn cũ ban đầu: <strong>{formatVNDate(selectedInvoice.due_date)}</strong></p>
                    <p className="mt-1">Dư nợ còn lại: <strong>{formatVNCurrency(selectedInvoice.remaining_balance)}</strong></p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hạn thanh toán mới sau gia hạn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={extendedDueDate}
                      onChange={(e) => setExtendedDueDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Lý do gia hạn <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Ví dụ: Khách gửi công văn xin gia hạn thêm 15 ngày do chờ nguồn thu ngân sách..."
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsExtensionModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
                    >
                      Xác nhận gia hạn
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
          <CheckCircle className="w-3 h-3" /> Đã trả hết
        </span>
      );
    case "partially_paid":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
          Trả 1 phần
        </span>
      );
    case "overdue":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
          Quá hạn
        </span>
      );
    case "due_today":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800">
          Đến hạn hôm nay
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
          Chưa đến hạn
        </span>
      );
    case "extended":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
          Đã gia hạn
        </span>
      );
    case "paused":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Tạm dừng
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 text-gray-800">
          Thiếu hồ sơ
        </span>
      );
  }
}
