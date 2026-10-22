import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quản Lý Công Nợ 90 Ngày | HKD Trần Thảo Trang",
  description: "Hệ thống quản lý công nợ 90 ngày, tự động tính phạt 0.1%/ngày, cảnh báo hạn thanh toán và theo dõi đôn đốc thu hồi nợ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
