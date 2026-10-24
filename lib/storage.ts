/**
 * LƯU TRỮ FILE PDF HÓA ĐƠN / BIÊN BẢN NGHIỆM THU (Supabase Storage)
 * ---------------------------------------------------------------------
 * - Bucket "invoice-files" là bucket RIÊNG TƯ. Trong bảng invoices ta chỉ lưu ĐƯỜNG DẪN file
 *   (cột invoice_file_url / acceptance_file_url); khi cần xem sẽ xin link tạm có thời hạn.
 * - Tạo bucket + quyền bằng file supabase/storage_invoice_files.sql.
 */
import { createClient } from "./supabase/client";

export const INVOICE_BUCKET = "invoice-files";
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

export type InvoiceFileKind = "invoice" | "acceptance";

export const FILE_KIND_LABEL: Record<InvoiceFileKind, string> = {
  invoice: "Hóa đơn điện tử",
  acceptance: "Biên bản nghiệm thu",
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Trả về thông báo lỗi nếu file không hợp lệ, ngược lại null. */
export function validatePdf(file: File): string | null {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) return "Chỉ nhận file PDF (.pdf).";
  if (file.size === 0) return "File rỗng, vui lòng chọn lại.";
  if (file.size > MAX_PDF_BYTES) {
    return `File quá lớn (${formatFileSize(file.size)}). Tối đa ${formatFileSize(MAX_PDF_BYTES)}.`;
  }
  return null;
}

/** "Bảng kê HĐ 138.pdf" -> "bang-ke-hd-138" (an toàn để làm tên file trên Storage). */
function slugify(name: string): string {
  return (
    name
      .replace(/\.pdf$/i, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "file"
  );
}

function storageError(err: { message?: string } | null | undefined): Error {
  const msg = err?.message || "";
  console.error("[Supabase Storage]", err);
  if (/bucket not found/i.test(msg)) {
    return new Error(
      'Chưa có kho lưu file "invoice-files" trên Supabase. Hãy chạy file supabase/storage_invoice_files.sql trong SQL Editor.'
    );
  }
  if (/row-level security|not authorized|permission|policy/i.test(msg)) {
    return new Error("Supabase từ chối quyền với kho file. Hãy chạy lại file supabase/storage_invoice_files.sql.");
  }
  if (/payload too large|exceeded the maximum/i.test(msg)) {
    return new Error("File vượt quá dung lượng cho phép (10 MB).");
  }
  if (/mime type/i.test(msg)) return new Error("Chỉ nhận file PDF.");
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return new Error("Không kết nối được tới Supabase Storage. Kiểm tra mạng rồi thử lại.");
  }
  return new Error(msg || "Lỗi không xác định khi làm việc với kho file.");
}

/** Tải 1 file PDF lên, trả về ĐƯỜNG DẪN để lưu vào cột *_file_url. */
export async function uploadInvoiceFile(file: File, kind: InvoiceFileKind, companyId: string): Promise<string> {
  const invalid = validatePdf(file);
  if (invalid) throw new Error(`${FILE_KIND_LABEL[kind]}: ${invalid}`);

  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${companyId || "chung"}/${Date.now()}-${rand}-${kind}-${slugify(file.name)}.pdf`;

  const { error } = await createClient()
    .storage.from(INVOICE_BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: false, cacheControl: "3600" });
  if (error) throw storageError(error);
  return path;
}

/** Xin link xem tạm thời (mặc định 1 giờ). Nếu đã là URL đầy đủ thì dùng nguyên. */
export async function getInvoiceFileUrl(pathOrUrl: string, expiresInSeconds = 3600): Promise<string> {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await createClient()
    .storage.from(INVOICE_BUCKET)
    .createSignedUrl(pathOrUrl, expiresInSeconds);
  if (error || !data?.signedUrl) throw storageError(error || { message: "Không tạo được link xem file." });
  return data.signedUrl;
}

/** Xóa file (không ném lỗi: dùng để dọn dẹp, lỗi chỉ ghi console). */
export async function removeInvoiceFiles(pathsOrUrls: Array<string | null | undefined>): Promise<void> {
  const paths = pathsOrUrls.filter((p): p is string => !!p && !/^https?:\/\//i.test(p));
  if (paths.length === 0) return;
  try {
    const { error } = await createClient().storage.from(INVOICE_BUCKET).remove(paths);
    if (error) console.error("[Supabase Storage] remove:", error);
  } catch (err) {
    console.error("[Supabase Storage] remove:", err);
  }
}

/** Tên hiển thị gọn cho file đã lưu: "1730000000000-ab12cd-invoice-hd-138.pdf" -> "hd-138.pdf". */
export function displayFileName(pathOrUrl: string): string {
  const last = decodeURIComponent(pathOrUrl.split("?")[0].split("/").pop() || "file.pdf");
  return last.replace(/^\d+-[a-z0-9]{6}-(invoice|acceptance)-/, "") || last;
}

/** Mở file trong tab mới (mở tab trước để trình duyệt không chặn popup). */
export async function openInvoiceFile(pathOrUrl: string): Promise<void> {
  const win = window.open("", "_blank");
  try {
    const url = await getInvoiceFileUrl(pathOrUrl);
    if (win) win.location.href = url;
    else window.location.href = url;
  } catch (err) {
    win?.close();
    throw err;
  }
}
