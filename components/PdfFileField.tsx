"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { formatFileSize, validatePdf } from "@/lib/storage";

interface Props {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

/** Ô chọn / kéo-thả 1 file PDF. */
export function PdfFileField({ label, hint, file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    const invalid = validatePdf(f);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    onChange(f);
  };

  return (
    <div>
      <label className="block font-semibold text-slate-700 mb-1">{label}</label>

      {file ? (
        <div className="flex items-center gap-3 px-3 py-2.5 border border-emerald-200 bg-emerald-50 rounded-lg">
          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-800 truncate">{file.name}</div>
            <div className="text-[10px] text-slate-500">{formatFileSize(file.size)} · sẽ được tải lên khi bấm Lưu</div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
            title="Bỏ file này"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`w-full flex flex-col items-center justify-center gap-1 px-3 py-4 border-2 border-dashed rounded-lg transition-colors ${
            dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
          }`}
        >
          <Upload className="w-5 h-5 text-slate-400" />
          <span className="font-medium text-slate-600">Bấm để chọn hoặc kéo thả file PDF vào đây</span>
          {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && <p className="mt-1 text-[11px] text-red-600 font-medium">{error}</p>}
    </div>
  );
}
