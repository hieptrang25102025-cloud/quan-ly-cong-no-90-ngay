"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { Invoice } from "@/types/debt";
import { formatVNCurrency, formatVNDate } from "@/lib/debt-engine";
import { updateInvoice, errorMessage } from "@/lib/db";
import {
  FILE_KIND_LABEL,
  InvoiceFileKind,
  displayFileName,
  getInvoiceFileUrl,
  openInvoiceFile,
  removeInvoiceFiles,
  uploadInvoiceFile,
} from "@/lib/storage";

type Tab = "invoice" | "acceptance" | "both";

interface Props {
  invoice: Invoice;
  onClose: () => void;
  /** Gọi sau khi thêm/thay/xóa file để trang tải lại dữ liệu. */
  onChanged: () => Promise<void> | void;
}

const pathOf = (inv: Invoice, kind: InvoiceFileKind) =>
  kind === "invoice" ? inv.invoice_file_url : inv.acceptance_file_url;

/**
 * Cửa sổ "Đối chiếu hồ sơ": xem trực tiếp file PDF hóa đơn / biên bản nghiệm thu
 * cạnh số liệu đã nhập, tích "Khớp" từng mục. Có thể bổ sung / thay / xóa file bất cứ lúc nào.
 */
export function InvoiceCompareModal({ invoice, onClose, onChanged }: Props) {
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && window.innerWidth >= 1024 ? "both" : "invoice"
  );
  const [urls, setUrls] = useState<Partial<Record<InvoiceFileKind, string>>>({});
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [busy, setBusy] = useState<InvoiceFileKind | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const invoicePath = invoice.invoice_file_url || "";
  const acceptancePath = invoice.acceptance_file_url || "";

  // Xin link xem tạm mỗi khi đường dẫn file thay đổi
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingUrl(true);
      setUrlError("");
      try {
        const [a, b] = await Promise.all([
          invoicePath ? getInvoiceFileUrl(invoicePath) : Promise.resolve(undefined),
          acceptancePath ? getInvoiceFileUrl(acceptancePath) : Promise.resolve(undefined),
        ]);
        if (!cancelled) setUrls({ invoice: a, acceptance: b });
      } catch (err) {
        if (!cancelled) setUrlError(errorMessage(err));
      } finally {
        if (!cancelled) setLoadingUrl(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoicePath, acceptancePath]);

  const saveFile = async (kind: InvoiceFileKind, file: File) => {
    setBusy(kind);
    const oldPath = pathOf(invoice, kind);
    let newPath = "";
    try {
      newPath = await uploadInvoiceFile(file, kind, invoice.company_id);
      await updateInvoice(
      invoice.id,
        kind === "invoice" ? { invoice_file_url: newPath } : { acceptance_file_url: newPath }
      );
      await removeInvoiceFiles([oldPath]); // dọn file cũ sau khi đã lưu thành công
      await onChanged();
    } catch (err) {
      if (newPath) await removeInvoiceFiles([newPath]);
      alert("Không lưu được file: " + errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const deleteFile = async (kind: InvoiceFileKind) => {
    const oldPath = pathOf(invoice, kind);
    if (!oldPath) return;
    if (!confirm(`Gỡ file "${FILE_KIND_LABEL[kind]}" khỏi hóa đơn số ${invoice.invoice_number}?`)) return;
    setBusy(kind);
    try {
      await updateInvoice(invoice.id, kind === "invoice" ? { invoice_file_url: "" } : { acceptance_file_url: "" });
      await removeInvoiceFiles([oldPath]);
      await onChanged();
    } catch (err) {
      alert("Không gỡ được file: " + errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const effectiveDue = invoice.extended_due_date || invoice.due_date;
  const rows: { key: string; label: string; value: string; source: InvoiceFileKind }[] = [
    { key: "number", label: "Số hóa đơn", value: invoice.invoice_number, source: "invoice" },
    { key: "serial", label: "Ký hiệu", value: invoice.invoice_serial || "-", source: "invoice" },
    { key: "date", label: "Ngày xuất HĐ", value: formatVNDate(invoice.invoice_date), source: "invoice" },
    { key: "amount", label: "Tổng giá trị", value: formatVNCurrency(invoice.total_amount), source: "invoice" },
    {
      key: "acc",
      label: "Ngày nghiệm thu",
      value: invoice.acceptance_date ? formatVNDate(invoice.acceptance_date) : "-",
      source: "acceptance",
    },
    {
      key: "recv",
      label: "Bên B nhận đủ hồ sơ",
      value: invoice.confirmed_start_date ? formatVNDate(invoice.confirmed_start_date) : "Chưa xác nhận",
      source: "acceptance",
    },
  ];
  const checkedCount = rows.filter((r) => checked[r.key]).length;

  const pane = (kind: InvoiceFileKind) => (
    <FilePane
      key={kind}
      kind={kind}
      path={pathOf(invoice, kind) || ""}
      url={urls[kind]}
      loading={loadingUrl}
      busy={busy === kind}
      onUpload={(f) => saveFile(kind, f)}
      onDelete={() => deleteFile(kind)}
    />
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-[1400px] h-[94vh] shadow-xl flex flex-col overflow-hidden">
        {/* Đầu */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="font-bold text-base text-slate-900 truncate">
              Đối chiếu hồ sơ – HĐ số {invoice.invoice_number}
              {invoice.invoice_serial ? ` (${invoice.invoice_serial})` : ""}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">{invoice.company_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none px-2">
            &times;
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Số liệu đã nhập */}
          <aside className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 p-4 overflow-y-auto text-xs space-y-3">
            <div>
              <div className="font-bold text-slate-800">Số liệu trong hệ thống</div>
              <div className="text-[11px] text-slate-500">Mở file bên cạnh, tích “Khớp” từng mục sau khi so.</div>
            </div>

            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.key} className="p-2 rounded-lg border border-slate-200 bg-slate-50/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">
                        {r.label} · trong {r.source === "invoice" ? "hóa đơn" : "biên bản"}
                      </div>
                      <div className="font-bold text-slate-900 break-words">{r.value}</div>
                    </div>
                    <label className="flex items-center gap-1 shrink-0 text-[11px] text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!checked[r.key]}
                        onChange={(e) => setChecked((c) => ({ ...c, [r.key]: e.target.checked }))}
                        className="accent-emerald-600"
                      />
                      Khớp
                    </label>
                  </div>
                </li>
              ))}
            </ul>

            <div
              className={`p-2 rounded-lg text-[11px] font-semibold ${
                checkedCount === rows.length ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              Đã đối chiếu {checkedCount}/{rows.length} mục
            </div>

            <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
              <div>Hạn thanh toán: <b className="text-slate-700">{effectiveDue ? formatVNDate(effectiveDue) : "-"}</b></div>
              <div>Còn nợ: <b className="text-slate-700">{formatVNCurrency(invoice.remaining_balance)}</b></div>
              {invoice.notes && <div className="italic pt-1">Ghi chú: {invoice.notes}</div>}
            </div>
          </aside>

          {/* Khu xem PDF */}
          <section className="flex-1 min-w-0 min-h-0 flex flex-col">
            <div className="flex items-center gap-1 px-4 pt-3">
              {(
                [
                  ["both", "Song song"],
                  ["invoice", "Hóa đơn"],
                  ["acceptance", "Biên bản nghiệm thu"],
                ] as [Tab, string][]
              ).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    tab === t ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  } ${t === "both" ? "hidden lg:inline-block" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {urlError && <p className="mx-4 mt-2 text-[11px] text-red-600 font-medium">{urlError}</p>}

            <div className="flex-1 min-h-0 p-4 flex gap-3">
              {tab === "both" ? (
                <>
                  <div className="flex flex-1 min-w-0">{pane("invoice")}</div>
                  <div className="flex flex-1 min-w-0">{pane("acceptance")}</div>
                </>
              ) : (
                <div className="flex flex-1 min-w-0">{pane(tab)}</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FilePane({
  kind,
  path,
  url,
  loading,
  busy,
  onUpload,
  onDelete,
}: {
  kind: InvoiceFileKind;
  path: string;
  url?: string;
  loading: boolean;
  busy: boolean;
  onUpload: (f: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = (f: File | undefined | null) => {
    if (inputRef.current) inputRef.current.value = "";
    if (f) onUpload(f);
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-800">{FILE_KIND_LABEL[kind]}</div>
          <div className="text-[10px] text-slate-500 truncate">{path ? displayFileName(path) : "Chưa đính kèm file"}</div>
        </div>
        {path && (
          <>
            <button
              onClick={() => openInvoiceFile(path).catch((e) => alert(errorMessage(e)))}
              className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
              title="Mở trong tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              title="Thay bằng file khác"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              title="Gỡ file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex-1 min-h-0 bg-slate-100 relative">
        {busy ? (
          <Centered>Đang xử lý file...</Centered>
        ) : !path ? (
          <Centered>
            <FileText className="w-8 h-8 text-slate-300" />
            <span className="text-xs text-slate-500">Chưa có file {FILE_KIND_LABEL[kind].toLowerCase()}</span>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
            >
              <Upload className="w-3.5 h-3.5" /> Đính kèm file PDF
            </button>
          </Centered>
        ) : loading && !url ? (
          <Centered>Đang tải file...</Centered>
        ) : url ? (
          <iframe src={url} title={FILE_KIND_LABEL[kind]} className="absolute inset-0 w-full h-full bg-white" />
        ) : (
          <Centered>Không mở được file. Thử bấm “Mở trong tab mới”.</Centered>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => choose(e.target.files?.[0])}
      />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 p-4 text-center">
      {children}
    </div>
  );
}
