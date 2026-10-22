import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        status: {
          paid: "#16a34a",       // Xanh: Đã thanh toán
          upcoming: "#eab308",   // Vàng: Sắp đến hạn
          dueToday: "#f59e0b",   // Vàng đậm: Đến hạn hôm nay
          recentOverdue: "#f97316", // Cam: Vừa quá hạn
          dangerOverdue: "#dc2626", // Đỏ: Quá hạn lâu (>30 ngày / cần ưu tiên)
          pending: "#6b7280",    // Xám: Thiếu dữ liệu / Chờ xác nhận
          dispute: "#8b5cf6",    // Tím: Đang tranh chấp / Đối chiếu
        }
      },
    },
  },
  plugins: [],
};
export default config;
