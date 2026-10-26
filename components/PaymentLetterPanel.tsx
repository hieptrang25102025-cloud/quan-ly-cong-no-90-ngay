"use client";

import { useEffect, useState } from "react";
import { Company, Invoice } from "@/types/debt";
import { exportPaymentRequestLetters } from "@/lib/excel-export";

const STAMP_KEY = "hkd_stamp_img_v1";
const SIGN_KEY = "hkd_sign_img_v1";

const safeGet = (key: string): string => {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
};

const safeSet = (key: string, value: string): boolean => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được file ảnh này"));
    };
    img.src = url;
  });
}

/** Bỏ nền giấy/nền trắng, cắt sát phần dấu hoặc chữ ký, rồi đặt vào khung kích thước cố định. */
async function cleanImage(file: File, outW: number, outH: number): Promise<string> {
  const img = await loadImage(file);
  const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const ctx = src.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Độ sáng nền = mức sáng ở phân vị 90%
  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
  }
  const total = w * h;
  let acc = 0;
  let bg = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.9) {
      bg = v;
      break;
    }
  }
  bg = Math.max(bg, 120);

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const alpha = clamp01(((bg - lum) / bg - 0.1) / 0.25);
      d[i + 3] = Math.round(alpha * 255);
      if (alpha > 0.3) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  if (maxX < 0) {
    minX = 0;
    minY = 0;
    maxX = w - 1;
    maxY = h - 1;
  }
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
  const k = Math.min(outW / cw, outH / ch);
  const dw = cw * k;
  const dh = ch * k;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(src, minX, minY, cw, ch, (outW - dw) / 2, (outH - dh) / 2, dw, dh);
  return out.toDataURL("image/png");
}

interface Props {
  companies: Company[];
  invoices: Invoice[];
}

export function PaymentLetterPanel({ companies, invoices }: Props) {
  const [stamp, setStamp] = useState("");
  const [sign, setSign] = useState("");
  const [useStamp, setUseStamp] = useState(true);
  const [useSign, setUseSign] = useState(true);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStamp(safeGet(STAMP_KEY));
    setSign(safeGet(SIGN_KEY));
  }, []);

  const pick = async (kind: "stamp" | "sign", file: File | undefined | null) => {
    if (!file) return;
    try {
      if (kind === "stamp") {
        const url = await cleanImage(file, 600, 255);
        if (!safeSet(STAMP_KEY, url)) alert("Không lưu được ảnh vào trình duyệt. Ảnh chỉ dùng được đến khi tải lại trang.");
        setStamp(url);
      } else {
        const url = await cleanImage(file, 390, 180);
        if (!safeSet(SIGN_KEY, url)) alert("Không lưu được ảnh vào trình duyệt. Ảnh chỉ dùng được đến khi tải lại trang.");
        setSign(url);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không xử lý được ảnh");
    }
  };

  const remove = (kind: "stamp" | "sign") => {
    if (kind === "stamp") {
      safeSet(STAMP_KEY, "");
      setStamp("");
    } else {
      safeSet(SIGN_KEY, "");
      setSign("");
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const n = await exportPaymentRequestLetters(
        { companies, invoices },
        {
          stampDataUrl: useStamp && stamp ? stamp : undefined,
          signatureDataUrl: useSign && sign ? sign : undefined,
          dueWithinDays: days,
        },
        `Thu_De_Nghi_Thanh_Toan_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      if (n === 0) {
        alert(`Hiện không có khoản nợ nào sắp đến hạn trong ${days} ngày hoặc đã quá hạn để lập thư.`);
      }
    } catch (err) {
      alert("Không xuất được thư: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const preview = (src: string) => (
    <div
      className="h-14 w-28 rounded border border-slate-200 flex items-center justify-center overflow-hidden"
      style={{ background: "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 12px 12px" }}
    >
      {src ? <img src={src} alt="" className="max-h-full max-w-full" /> : <span className="text-[10px] text-slate-400">Chưa chọn</span>}
    </div>
  );

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div>
        <h3 className="font-bold text-sm text-slate-800">Thư đề nghị thanh toán gửi khách hàng (file Excel)</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Mỗi công ty có nợ sắp đến hạn hoặc quá hạn sẽ được một trang thư riêng. Theo bộ lọc khách hàng ở bên dưới.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="font-semibold text-slate-700">Con dấu mộc</div>
          <div className="flex items-center gap-3">
            {preview(stamp)}
            <div className="space-y-1.5">
              <label className="inline-block px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold cursor-pointer hover:bg-blue-100">
                Chọn ảnh dấu
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { pick("stamp", e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {stamp && (
                <button onClick={() => remove("stamp")} className="block text-red-600 hover:underline">
                  Xóa ảnh
                </button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
            <input type="checkbox" checked={useStamp} onChange={(e) => setUseStamp(e.target.checked)} />
            Chèn con dấu vào thư (bỏ tick = chừa trắng để in ra đóng dấu)
          </label>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="font-semibold text-slate-700">Chữ ký</div>
          <div className="flex items-center gap-3">
            {preview(sign)}
            <div className="space-y-1.5">
              <label className="inline-block px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold cursor-pointer hover:bg-blue-100">
                Chọn ảnh chữ ký
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { pick("sign", e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {sign && (
                <button onClick={() => remove("sign")} className="block text-red-600 hover:underline">
                  Xóa ảnh
                </button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
            <input type="checkbox" checked={useSign} onChange={(e) => setUseSign(e.target.checked)} />
            Chèn chữ ký vào thư (bỏ tick = chừa trắng để ký tay)
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-2 text-slate-700">
          Tính "sắp đến hạn" trong
          <input
            type="number"
            min={1}
            max={60}
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 7))}
            className="w-16 px-2 py-1.5 border rounded-lg"
          />
          ngày tới
        </label>
        <button
          onClick={handleExport}
          disabled={busy}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-60"
        >
          {busy ? "Đang tạo thư..." : "Xuất thư đề nghị thanh toán (.xlsx)"}
        </button>
      </div>

      <p className="text-[11px] text-slate-400">
        Ảnh dấu và chữ ký chỉ lưu trong trình duyệt của thiết bị này, không đưa lên web. Mỗi thiết bị cần chọn ảnh một lần.
      </p>
    </div>
  );
}