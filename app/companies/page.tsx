"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { DbStatus } from "@/components/DbStatus";
import { useDebtData } from "@/lib/use-debt-data";
import { createCompany, updateCompany, errorMessage } from "@/lib/db";
import { Company } from "@/types/debt";
import { formatVNCurrency } from "@/lib/debt-engine";
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function CompaniesPage() {
  const { companies, invoices, loading, errors, reload } = useDebtData(["companies", "invoices"]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tax_code.includes(searchQuery) ||
      (c.contact_person && c.contact_person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingCompany(null);
    setName("");
    setTaxCode("");
    setAddress("");
    setContactPerson("");
    setContactEmail("");
    setContactPhone("");
    setBankAccount("");
    setBankName("");
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setName(comp.name);
    setTaxCode(comp.tax_code);
    setAddress(comp.address || "");
    setContactPerson(comp.contact_person || "");
    setContactEmail(comp.contact_email || "");
    setContactPhone(comp.contact_phone || "");
    setBankAccount(comp.bank_account || "");
    setBankName(comp.bank_name || "");
    setNotes(comp.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !taxCode.trim()) {
      alert("Vui lòng nhập tên công ty và mã số thuế!");
      return;
    }

    const input = {
      name,
      tax_code: taxCode,
      address,
      contact_person: contactPerson,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      bank_account: bankAccount,
      bank_name: bankName,
      notes,
    };

    setIsSaving(true);
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, input);
      } else {
        await createCompany(input);
      }
      await reload();
      setIsModalOpen(false);
    } catch (err) {
      alert("Không lưu được công ty: " + errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Quản lý công ty khách hàng" />

        <main className="p-6 space-y-6 overflow-y-auto">
          <DbStatus loading={loading} errors={errors} onRetry={reload} />

          {/* Header controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên công ty, mã số thuế, người liên hệ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm công ty mới
            </button>
          </div>

          {/* Danh sách công ty */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCompanies.map((comp) => {
              const compInvoices = invoices.filter((i) => i.company_id === comp.id);
              const totalDebt = compInvoices.reduce((acc, cur) => acc + cur.remaining_balance, 0);
              const overdueDebt = compInvoices
                .filter((i) => i.days_overdue > 0)
                .reduce((acc, cur) => acc + cur.remaining_balance, 0);

              return (
                <div
                  key={comp.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{comp.name}</h3>
                          {comp.status === "active" ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="w-2.5 h-2.5" /> Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              <XCircle className="w-2.5 h-2.5" /> Ngưng
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-500 mt-1">MST: {comp.tax_code}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(comp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 pt-1">
                      {comp.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span>{comp.address}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {comp.contact_person && (
                          <span className="font-medium text-slate-700">Liên hệ: {comp.contact_person}</span>
                        )}
                        {comp.contact_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{comp.contact_phone}</span>
                          </div>
                        )}
                        {comp.contact_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{comp.contact_email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thống kê công nợ công ty */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Số hóa đơn:</span>
                      <span className="font-bold text-slate-800">{compInvoices.length} HĐ</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Tổng nợ chưa thu:</span>
                      <span className="font-bold text-slate-900">{formatVNCurrency(totalDebt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Nợ quá hạn:</span>
                      <span className={`font-bold ${overdueDebt > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatVNCurrency(overdueDebt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Thêm/Sửa */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">
                    {editingCompany ? "Chỉnh sửa công ty khách hàng" : "Thêm công ty khách hàng mới"}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tên công ty khách hàng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: CÔNG TY TNHH XÂY DỰNG MÔI TRƯỜNG XANH"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mã số thuế <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 0304599836"
                        value={taxCode}
                        onChange={(e) => setTaxCode(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Người liên hệ</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: TRẦN ANH TUẤN (Giám đốc)"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Địa chỉ trụ sở</label>
                    <input
                      type="text"
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                      <input
                        type="text"
                        placeholder="0908xxxxxx"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Email liên hệ <span className="text-[10px] text-slate-400 font-normal">(Chỉ lưu tra cứu)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="ketoan@congty.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Số tài khoản ngân hàng</label>
                      <input
                        type="text"
                        placeholder="130993789"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ngân hàng</label>
                      <input
                        type="text"
                        placeholder="ACB - CN Gò Mây"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ghi chú nghiệp vụ</label>
                    <textarea
                      rows={2}
                      placeholder="Ghi chú về thói quen thanh toán, người ký duyệt lệnh..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isSaving ? "Đang lưu..." : editingCompany ? "Lưu thay đổi" : "Thêm mới"}
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