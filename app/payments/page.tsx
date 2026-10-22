"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { INITIAL_INVOICES, INITIAL_PAYMENTS, INITIAL_COMPANIES } from "@/lib/data-store";
import { Payment, Invoice } from "@/types/debt";
import {
  formatVNCurrency,
  formatVNDate,
  allocatePayment,
  calculateDaysOverdue,
  calculateEstimatedPenalty,
} from "@/lib/debt-engine";
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  FileCheck,
  Calendar,
} from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [companies] = useState(INITIAL_COMPANIES);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id || "");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "cash" | "other">("bank_transfer");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  const filteredPayments = payments.filter((p) => {
    return (
      (p.transaction_ref && p.transaction_ref.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const openAddModal = (invId?: string) => {
    const targetInvId = invId || invoices[0]?.id || "";
    setInvoiceId(targetInvId);
    const targetInv = invoices.find((i) => i.id === targetInvId);
    setAmount(targetInv ? targetInv.remaining_balance : 0);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("bank_transfer");
    setTransactionRef("");
    setNotes("Khách chuyển khoản thanh toán");
    setIsModalOpen(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || amount <= 0) {
      alert("Vui lòng chọn hóa đơn và số tiền thanh toán lớn hơn 0!");
      return;
    }

    const currentInvoice = invoices.find((i) => i.id === invoiceId);
    if (!currentInvoice) return;

    // Phân bổ thanh toán và cập nhật số dư
    const allocation = allocatePayment(currentInvoice.paid_amount, currentInvoice.total_amount, Number(amount));

    if (allocation.overpaidAmount > 0) {
      const confirmOverpay = confirm(
        `Số tiền thanh toán (${formatVNCurrency(amount)}) lớn hơn số dư nợ còn lại (${formatVNCurrency(
          currentInvoice.remaining_balance
        )}). Thừa: ${formatVNCurrency(allocation.overpaidAmount)}. Bạn có chắc chắn muốn ghi nhận không?`
      );
      if (!confirmOverpay) return;
    }

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      invoice_id: invoiceId,
      company_id: currentInvoice.company_id,
      payment_date: paymentDate,
      amount: Number(amount),
      payment_method: paymentMethod,
      transaction_ref: transactionRef,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);

    // Cập nhật hóa đơn
    const effectiveDue = currentInvoice.extended_due_date || currentInvoice.due_date;
    const daysOverdue = effectiveDue ? calculateDaysOverdue(effectiveDue) : 0;
    const newPenalty = calculateEstimatedPenalty(allocation.newRemainingBalance, 0.001, daysOverdue);

    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              paid_amount: allocation.newPaidAmount,
              remaining_balance: allocation.newRemainingBalance,
              days_overdue: allocation.isFullyPaid ? 0 : daysOverdue,
              estimated_penalty: allocation.isFullyPaid ? 0 : newPenalty,
              status: allocation.isFullyPaid ? "fully_paid" : "partially_paid",
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );

    setIsModalOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Ghi nhận thanh toán nhiều lần" />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Header Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã giao dịch, ghi chú thanh toán..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <button
              onClick={() => openAddModal()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Ghi nhận đợt thanh toán mới
            </button>
          </div>

          {/* Danh Sách Hóa Đơn Cần Thu Tiền */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Các Khoản Công Nợ Đang Chờ Thu Tiền
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {invoices
                .filter((i) => i.remaining_balance > 0)
                .map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs line-clamp-1">{inv.company_name}</span>
                        <span className="font-mono text-[11px] font-bold text-blue-700">HĐ #{inv.invoice_number}</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 space-y-1">
                        <div>Tổng hóa đơn: {formatVNCurrency(inv.total_amount)}</div>
                        <div>Đã thanh toán: {formatVNCurrency(inv.paid_amount)}</div>
                        <div className="text-red-600 font-bold">
                          Còn nợ: {formatVNCurrency(inv.remaining_balance)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openAddModal(inv.id)}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thu tiền đợt này
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Lịch Sử Các Giao Dịch Thanh Toán */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">
                Lịch Sử Các Lần Nhận Tiền ({filteredPayments.length} giao dịch)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Ngày nhận</th>
                    <th className="px-4 py-3">Mã GD / Chứng từ</th>
                    <th className="px-4 py-3">Hóa đơn liên quan</th>
                    <th className="px-4 py-3 text-right">Số tiền đã thu</th>
                    <th className="px-4 py-3">Hình thức nhận</th>
                    <th className="px-4 py-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Chưa có giao dịch thanh toán nào.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const relatedInv = invoices.find((i) => i.id === p.invoice_id);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">{formatVNDate(p.payment_date)}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-slate-700 font-medium">
                              {p.transaction_ref || p.id.slice(0, 10)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">
                              HĐ #{relatedInv?.invoice_number || p.invoice_id}
                            </div>
                            <div className="text-[11px] text-slate-500">{relatedInv?.company_name}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-emerald-700 font-mono text-sm">
                              +{formatVNCurrency(p.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {p.payment_method === "bank_transfer" ? "Chuyển khoản Vietcombank" : "Tiền mặt"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.notes || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Ghi Nhận Thanh Toán */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">Ghi nhận giao dịch thanh toán</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hóa đơn thanh toán <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={invoiceId}
                      onChange={(e) => {
                        setInvoiceId(e.target.value);
                        const inv = invoices.find((i) => i.id === e.target.value);
                        if (inv) setAmount(inv.remaining_balance);
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          HĐ #{inv.invoice_number} - {inv.company_name} (Số dư nợ: {formatVNCurrency(inv.remaining_balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Số tiền thực nhận (VNĐ) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1000}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ngày thanh toán</label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Hình thức nhận tiền</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                        <option value="cash">Tiền mặt</option>
                        <option value="other">Hình thức khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mã tham chiếu GD ngân hàng</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: FT26254881023..."
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ghi chú giao dịch</label>
                    <textarea
                      rows={2}
                      placeholder="Ghi chú người nộp tiền, chi nhánh ngân hàng, nội dung lệnh chuyển tiền..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700"
                    >
                      Lưu thanh toán
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
