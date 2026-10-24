"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { DbStatus } from "@/components/DbStatus";
import { useDebtData } from "@/lib/use-debt-data";
import { createContract, updateContract, errorMessage } from "@/lib/db";
import { Contract } from "@/types/debt";
import { formatVNDate } from "@/lib/debt-engine";
import { Plus, Search, Edit, Calendar, Percent } from "lucide-react";

export default function ContractsPage() {
  const { contracts, companies, loading, errors, reload } = useDebtData(["contracts", "companies"]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Form State
  const [companyId, setCompanyId] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [contractName, setContractName] = useState("");
  const [signedDate, setSignedDate] = useState("2026-08-01");
  const [effectiveDate, setEffectiveDate] = useState("2026-08-01");
  const [paymentTermsDays, setPaymentTermsDays] = useState(90);
  const [penaltyRateDaily, setPenaltyRateDaily] = useState(0.001);
  const [notes, setNotes] = useState("");

  const filteredContracts = contracts.filter(
    (c) =>
      c.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contract_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingContract(null);
    setCompanyId(companies[0]?.id || "");
    setContractNumber("");
    setContractName("");
    setSignedDate("2026-08-01");
    setEffectiveDate("2026-08-01");
    setPaymentTermsDays(90);
    setPenaltyRateDaily(0.001);
    setNotes("Thanh toán trong vòng 90 ngày sau khi Bên A cung cấp HĐĐT và BBNT. Phạt 0,1%/ngày chậm thanh toán.");
    setIsModalOpen(true);
  };

  const openEditModal = (c: Contract) => {
    setEditingContract(c);
    setCompanyId(c.company_id);
    setContractNumber(c.contract_number);
    setContractName(c.contract_name);
    setSignedDate(c.signed_date);
    setEffectiveDate(c.effective_date);
    setPaymentTermsDays(c.payment_terms_days);
    setPenaltyRateDaily(c.penalty_rate_daily);
    setNotes(c.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractNumber.trim() || !contractName.trim() || !companyId) {
      alert("Vui lòng điền đầy đủ thông tin hợp đồng!");
      return;
    }

    const input = {
      company_id: companyId,
      contract_number: contractNumber,
      contract_name: contractName,
      signed_date: signedDate,
      effective_date: effectiveDate,
      payment_terms_days: Number(paymentTermsDays),
      penalty_rate_daily: Number(penaltyRateDaily),
      notes,
    };

    setIsSaving(true);
    try {
      if (editingContract) {
        await updateContract(editingContract.id, input);
      } else {
        await createContract(input);
      }
      await reload();
      setIsModalOpen(false);
    } catch (err) {
      alert("Không lưu được hợp đồng: " + errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Quản lý hợp đồng nguyên tắc" />

        <main className="p-6 space-y-6 overflow-y-auto">
          <DbStatus loading={loading} errors={errors} onRetry={reload} />

          {/* Header controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo số hợp đồng, tên khách hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm hợp đồng mới
            </button>
          </div>

          {/* Danh sách hợp đồng */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredContracts.length === 0 && !loading && (
              <p className="text-xs text-slate-400">Chưa có hợp đồng nào.</p>
            )}
            {filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {contract.contract_number}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1.5">{contract.contract_name}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">{contract.company_name}</p>
                  </div>

                  <button
                    onClick={() => openEditModal(contract)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ngày ký: {formatVNDate(contract.signed_date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hiệu lực: {formatVNDate(contract.effective_date)}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Thời hạn thanh toán:</span>
                    <span className="font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-100/60">
                      {contract.payment_terms_days} ngày lịch
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Mức phạt chậm thanh toán:</span>
                    <span className="font-bold text-red-600 px-2 py-0.5 rounded bg-red-100/60 flex items-center gap-1">
                      <Percent className="w-3 h-3" /> {(contract.penalty_rate_daily * 100).toFixed(1)}%/ngày
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                    <strong>Ghi chú điều khoản:</strong> {contract.notes || "Không có"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Thêm / Chỉnh sửa */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">
                    {editingContract ? "Chỉnh sửa hợp đồng" : "Thêm hợp đồng nguyên tắc mới"}
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
                      Công ty khách hàng <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} (MST: {comp.tax_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Số hợp đồng <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 108/2026/HĐNT: MTX-TT"
                        value={contractNumber}
                        onChange={(e) => setContractNumber(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tên hợp đồng <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Hợp đồng nguyên tắc sửa chữa xe 2026"
                        value={contractName}
                        onChange={(e) => setContractName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ngày ký</label>
                      <input
                        type="date"
                        value={signedDate}
                        onChange={(e) => setSignedDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ngày hiệu lực</label>
                      <input
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Số ngày thanh toán (Mặc định: 90 ngày)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={paymentTermsDays}
                        onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mức phạt chậm/ngày (Mặc định: 0.001 = 0.1%)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={penaltyRateDaily}
                        onChange={(e) => setPenaltyRateDaily(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ghi chú điều khoản hợp đồng</label>
                    <textarea
                      rows={3}
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
                      {isSaving ? "Đang lưu..." : editingContract ? "Lưu thay đổi" : "Tạo hợp đồng"}
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