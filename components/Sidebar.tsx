"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Receipt,
  Bell,
  PhoneCall,
  CreditCard,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  unreadNotifsCount?: number;
}

export function Sidebar({ unreadNotifsCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/companies", label: "Công ty khách hàng", icon: Building2 },
    { href: "/contracts", label: "Hợp đồng", icon: FileText },
    { href: "/invoices", label: "Hóa đơn & Công nợ", icon: Receipt },
    {
      href: "/notifications",
      label: "Trung tâm thông báo",
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
    },
    { href: "/contacts", label: "Lịch sử liên hệ", icon: PhoneCall },
    { href: "/payments", label: "Ghi nhận thanh toán", icon: CreditCard },
    { href: "/reports", label: "Báo cáo & Excel", icon: BarChart3 },
    { href: "/settings", label: "Cài đặt hệ thống", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
            90D
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white uppercase">Quản Lý Công Nợ</h1>
            <p className="text-xs text-slate-400">HKD Trần Thảo Trang</p>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Tự động kiểm tra: 09:00 AM</span>
        </div>
        <p className="text-[11px] text-slate-500">Múi giờ: Asia/Ho_Chi_Minh</p>
        <p className="text-[11px] text-slate-500">Phạt chậm trả: 0,1%/ngày</p>
      </div>
    </aside>
  );
}
