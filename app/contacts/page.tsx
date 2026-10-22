"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { INITIAL_COMPANIES, INITIAL_INVOICES, INITIAL_CONTACTS, INITIAL_PROMISES } from "@/lib/data-store";
import { ContactHistory, ContactChannel, ContactResult, PaymentPromise } from "@/types/debt";
import { formatVNDate, formatVNCurrency } from "@/lib/debt-engine";
import {
  PhoneCall,
  Plus,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
} from "lucide-react";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactHistory[]>(INITIAL_CONTACTS);
  const [promises, setPromises] = useState<PaymentPromise[]>(INITIAL_PROMISES);
  const [invoices] = useState(INITIAL_INVOICES);
  const [companies] = useState(INITIAL_COMPANIES);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id || "");
  const [channel, setChannel] = useState<ContactChannel>("call");
  const [contactPerson, setContactPerson] = useState("Chị Mai (Kế toán)");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<ContactResult>("called");
  const [promisedDate, setPromisedDate] = useState("");
  const [promisedAmount, setPromisedAmount] = useState<number>(0);
  const [nextStepNotes, setNextStepNotes] = useState("");

  const filteredContacts = contacts.filter((c) => {
    return (
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.invoice_number && c.invoice_number.includes(searchQuery)) ||
      c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_person.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const openAddModal = () => {
    setInvoiceId(invoices[0]?.id || "");
    setChannel("call");
    setContactPerson("");
    setContent("");
    setResult("called");
    setPromisedDate("");
    setPromisedAmount(0);
    setNextStepNotes("");
    setIsModalOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !contactPerson || !content) {
      alert("Vui lòng nhập người liên hệ và nội dung trao đổi!");
      return;
    }

    const selectedInv = invoices.find((i) => i.id === invoiceId);
    const selectedComp = companies.find((c) => c.id === selectedInv?.company_id);

    const newContact: ContactHistory = {
      id: `cont-${Date.now()}`,
      invoice_id: invoiceId,
      company_id: selectedInv?.company_id || "",
      company_name: selectedComp?.name || "",
      invoice_number: selectedInv?.invoice_number || "",
      contact_date: new Date().toISOString(),
      channel,
      contact_person: contactPerson,
      content,
      result,
      promised_date: promisedDate || undefined,
      next_step_notes: nextStepNotes,
      created_at: new Date().toISOString(),
    };

    setContacts((prev) => [newContact, ...prev]);

    // Nếu khách hẹn ngày thanh toán, tự động thêm vào Payment Promises
    if (result === "promised_payment" && promisedDate) {
      const newPromise: PaymentPromise = {
        id: `prom-${Date.now()}`,
        invoice_id: invoiceId,
        company_id: selectedInv?.company_id || "",
        company_name: selectedComp?.name || "",
        invoice_number: selectedInv?.invoice_number || "",
        promised_date: promisedDate,
        promised_amount: promisedAmount > 0 ? promisedAmount : selectedInv?.remaining_balance,
        contact_history_id: newContact.id,
        status: "pending",
        notes: `Khách hẹn qua cuộc gọi với ${contactPerson}: ${content}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPromises((prev) => [newPromise, ...prev]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Nhật ký liên hệ & lịch hẹn thanh toán" />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Note quan trọng */}
          <div className="p-4 rounded-xl bg-slate-900 text-white text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <h4 className="font-bold flex items-center gap-1.5 text-amber-400">
                <PhoneCall className="w-4 h-4" /> Nguyên tắc liên hệ công nợ
              </h4>
              <p className="text-slate-300 leading-relaxed max-w-3xl">
                Bạn trực tiếp gọi điện, nhắn tin Zalo hoặc gửi email cho kế toán / giám đốc khách hàng. Hệ thống
                lưu nhật ký trao đổi và sẽ <strong>tự động cảnh báo vào đúng ngày khách hẹn trả nợ</strong> nếu chưa có
                tiền về tài khoản.
              </p>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm text-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Ghi nhận lần liên hệ mới
            </button>
          </div>

          {/* Lịch Hẹn Thanh Toán Đang Chờ (Payment Promises) */}
          {promises.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Danh Sách Khách Hàng Đã Hẹn Ngày Thanh Toán ({promises.length})
                </h3>
                <span className="text-xs text-slate-400">Hệ thống sẽ cảnh báo vào đúng ngày hẹn</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {promises.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{p.company_name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px]">
                          HĐ {p.invoice_number}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Số tiền hẹn trả:{" "}
                        <strong className="text-emerald-700 font-mono">
                          {p.promised_amount ? formatVNCurrency(p.promised_amount) : "Toàn bộ số dư"}
                        </strong>
                      </p>
                      <p className="text-[11px] text-slate-500 italic">{p.notes}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Ngày hẹn:</span>
                      <span className="font-bold text-emerald-800 text-sm">{formatVNDate(p.promised_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tìm kiếm & Danh sách nhật ký liên hệ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo khách hàng, số hóa đơn, người trao đổi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Tổng cộng: {filteredContacts.length} lần liên hệ
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Chưa có lịch sử liên hệ nào được ghi nhận.</div>
              ) : (
                filteredContacts.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ChannelBadge channel={c.channel} />
                        <span className="font-bold text-slate-900 text-xs">{c.company_name}</span>
                        <span className="font-mono text-[11px] text-slate-500">(HĐ #{c.invoice_number})</span>
                        <span className="text-slate-400 text-xs">| Người nghe:</span>
                        <span className="font-medium text-slate-700 text-xs">{c.contact_person}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <ResultBadge result={c.result} />
                        <span className="text-[11px] text-slate-400">{formatVNDate(c.contact_date)}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                      {c.content}
                    </div>

                    {(c.promised_date || c.next_step_notes) && (
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                        {c.promised_date && (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Hẹn thanh toán vào ngày: {formatVNDate(c.promised_date)}
                          </span>
                        )}
                        {c.next_step_notes && (
                          <span>
                            <strong>Hành động tiếp theo:</strong> {c.next_step_notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal Ghi Nhận Lần Liên Hệ Mới */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">Ghi nhận liên hệ đôn đốc công nợ</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSaveContact} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hóa đơn công nợ liên quan <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={invoiceId}
                      onChange={(e) => setInvoiceId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          HĐ #{inv.invoice_number} - {inv.company_name} (Còn nợ: {formatVNCurrency(inv.remaining_balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Hình thức liên hệ</label>
                      <select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value as ContactChannel)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="call">Gọi điện thoại</option>
                        <option value="zalo">Nhắn tin Zalo</option>
                        <option value="email_manual">Gửi email thủ công</option>
                        <option value="meeting">Gặp trực tiếp</option>
                        <option value="other">Hình thức khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Người liên hệ / chức vụ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Chị Mai (Kế toán), Anh Tuấn (GĐ)..."
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nội dung trao đổi cụ thể <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Ghi rõ nội dung bạn đã trao đổi với khách, phản hồi của họ, lý do chậm trễ nếu có..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kết quả trao đổi</label>
                    <select
                      value={result}
                      onChange={(e) => setResult(e.target.value as ContactResult)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="promised_payment">Khách hẹn ngày thanh toán</option>
                      <option value="called">Đã gọi điện trao đổi xong</option>
                      <option value="zalo_sent">Đã gửi tin nhắn Zalo</option>
                      <option value="email_sent">Đã gửi email thủ công</option>
                      <option value="requested_reconciliation">Khách yêu cầu đối chiếu số liệu</option>
                      <option value="requested_postponement">Khách đề nghị gia hạn</option>
                      <option value="in_dispute">Đang tranh chấp / chưa thống nhất</option>
                      <option value="no_answer">Khách không nghe máy / chưa phản hồi</option>
                      <option value="paused">Tạm dừng nhắc theo thỏa thuận</option>
                      <option value="resolved">Đã giải quyết xong</option>
                    </select>
                  </div>

                  {/* Nếu khách hẹn ngày thanh toán */}
                  {result === "promised_payment" && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                      <div className="font-bold text-emerald-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        Thiết lập lịch hẹn thanh toán
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Ngày khách hẹn trả <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={promisedDate}
                            onChange={(e) => setPromisedDate(e.target.value)}
                            className="w-full px-2 py-1.5 border rounded-lg bg-white"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Số tiền hẹn trả (VNĐ)</label>
                          <input
                            type="number"
                            placeholder="Để 0 nếu trả hết số dư"
                            value={promisedAmount}
                            onChange={(e) => setPromisedAmount(Number(e.target.value))}
                            className="w-full px-2 py-1.5 border rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ghi chú hành động tiếp theo</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Gọi lại vào sáng thứ 2 tuần sau nếu chưa thấy lệnh chuyển..."
                      value={nextStepNotes}
                      onChange={(e) => setNextStepNotes(e.target.value)}
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                    >
                      Lưu lịch sử
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

function ChannelBadge({ channel }: { channel: ContactChannel }) {
  switch (channel) {
    case "call":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
          <PhoneCall className="w-3 h-3" /> Gọi điện
        </span>
      );
    case "zalo":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
          <MessageSquare className="w-3 h-3" /> Zalo
        </span>
      );
    case "email_manual":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
          <Mail className="w-3 h-3" /> Email thủ công
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
          Khác
        </span>
      );
  }
}

function ResultBadge({ result }: { result: ContactResult }) {
  switch (result) {
    case "promised_payment":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
          Khách hẹn trả
        </span>
      );
    case "requested_postponement":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">
          Xin gia hạn
        </span>
      );
    case "requested_reconciliation":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
          Yêu cầu đối chiếu
        </span>
      );
    case "in_dispute":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
          Tranh chấp
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
          Đã liên hệ
        </span>
      );
  }
}
