"use client";

import Link from "next/link";
import { Bell, RefreshCw, UserCheck, Calendar } from "lucide-react";
import { formatVNDate } from "@/lib/debt-engine";

interface HeaderProps {
  title?: string;
  unreadCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({
  title = "Tổng quan công nợ",
  unreadCount = 0,
  onRefresh,
  isRefreshing = false,
}: HeaderProps) {
  const todayStr = formatVNDate(new Date());

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs text-slate-600 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Hôm nay: {todayStr} (VN)</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Làm mới dữ liệu và chạy kiểm tra công nợ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">{isRefreshing ? "Đang tính..." : "Kiểm tra ngay"}</span>
          </button>
        )}

        <Link
          href="/notifications"
          className="relative p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          title="Xem trung tâm thông báo"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold text-center text-white bg-red-500 rounded-full border-2 border-white">
              {unreadCount}
            </span>
          )}
        </Link>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-semibold text-xs">
            TT
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="font-semibold text-slate-700 leading-tight">HKD Trần Thảo Trang</p>
            <p className="text-[11px] text-slate-400">Chủ tài khoản (Bên A)</p>
          </div>
        </div>
      </div>
    </header>
  );
}
