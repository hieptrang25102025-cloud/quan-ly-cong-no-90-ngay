"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { INITIAL_INVOICES, INITIAL_PROMISES } from "@/lib/data-store";
import { evaluateNotifications, formatVNCurrency, formatVNDate } from "@/lib/debt-engine";
import { NotificationItem, NotificationPriority } from "@/types/debt";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  Eye,
  Check,
  Calendar,
  ExternalLink,
  Filter,
} from "lucide-react";

export default function NotificationsPage() {
  const [invoices] = useState(INITIAL_INVOICES);
  const [promises] = useState(INITIAL_PROMISES);
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("all");

  // Tự động sinh thông báo theo quy tắc nghiệp vụ
  const allGenerated = useMemo(() => {
    return evaluateNotifications(invoices, promises, new Date());
  }, [invoices, promises]);

  // Merge với trạng thái đọc/xử lý
  const notifications: NotificationItem[] = useMemo(() => {
    return allGenerated.map((g) => ({
      id: g.dedup_key,
      invoice_id: g.invoice_id,
      company_id: g.company_id,
      company_name: g.company_name,
      invoice_number: g.invoice_number,
      contract_number: g.contract_number,
      notification_type: g.notification_type,
      milestone_date: g.milestone_date,
      dedup_key: g.dedup_key,
      title: g.title,
      message: g.message,
      priority: g.priority,
      suggested_action: g.suggested_action,
      remaining_balance: g.remaining_balance,
      estimated_penalty: g.estimated_penalty,
      days_overdue: g.days_overdue,
      is_read: readKeys.has(g.dedup_key),
      is_resolved: resolvedKeys.has(g.dedup_key),
      created_at: g.milestone_date,
    }));
  }, [allGenerated, readKeys, resolvedKeys]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifs = notifications.filter((n) => {
    if (filterType === "unread") return !n.is_read;
    if (filterType === "unresolved") return !n.is_resolved;
    if (filterType === "urgent") return n.priority === "urgent" || n.priority === "high";
    return true;
  });

  const markAsRead = (dedupKey: string) => {
    setReadKeys((prev) => {
      const next = new Set(prev);
      next.add(dedupKey);
      return next;
    });
  };

  const markAllAsRead = () => {
    setReadKeys(new Set(notifications.map((n) => n.dedup_key)));
  };

  const toggleResolved = (dedupKey: string) => {
    setResolvedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dedupKey)) {
        next.delete(dedupKey);
      } else {
        next.add(dedupKey);
        // Đánh dấu đã xử lý thì cũng đánh dấu là đã đọc
        setReadKeys((r) => {
          const nextR = new Set(r);
          nextR.add(dedupKey);
          return nextR;
        });
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar unreadNotifsCount={unreadCount} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Trung tâm cảnh báo & thông báo công nợ" unreadCount={unreadCount} />

        <main className="p-6 space-y-6 overflow-y-auto">
          {/* Note quan trọng về nghiệp vụ */}
          <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="font-bold flex items-center gap-1.5 text-blue-950">
                <Bell className="w-4 h-4 text-blue-600" /> Trung tâm thông báo độc quyền cho chính bạn
              </h4>
              <p className="text-blue-800 leading-relaxed">
                Hệ thống <strong>TUYỆT ĐỐI KHÔNG tự động gửi email hay nhắn tin nhắc nợ cho khách hàng</strong>.
                Tất cả cảnh báo tại đây được sinh tự động trên máy chủ lúc 09:00 sáng mỗi ngày để bạn chủ động nắm
                thông tin và tự quyết định liên hệ khách hàng qua điện thoại, Zalo hay email thủ công.
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm text-xs"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-4 h-4 text-slate-400" />
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                onClick={() => setFilterType("unread")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === "unread"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
              <button
                onClick={() => setFilterType("unresolved")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === "unresolved"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Cần xử lý ({notifications.filter((n) => !n.is_resolved).length})
              </button>
              <button
                onClick={() => setFilterType("urgent")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === "urgent"
                    ? "bg-red-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Ưu tiên cao / Khẩn cấp
              </button>
            </div>

            <span className="text-xs text-slate-400">
              Cơ chế chống trùng: <code>dedup_key = ID:TYPE:MILESTONE</code>
            </span>
          </div>

          {/* Danh sách thông báo */}
          <div className="space-y-3">
            {filteredNotifs.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">Tuyệt vời! Không có cảnh báo công nợ nào tồn đọng</h4>
                <p className="text-xs text-slate-500">Mọi khoản nợ đều trong hạn hoặc đã được bạn xử lý.</p>
              </div>
            ) : (
              filteredNotifs.map((notif) => {
                const isUrgent = notif.priority === "urgent";
                const isHigh = notif.priority === "high";

                return (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border transition-all ${
                      notif.is_resolved
                        ? "bg-slate-50 border-slate-200 opacity-60"
                        : notif.is_read
                        ? "bg-white border-slate-200 shadow-sm"
                        : isUrgent
                        ? "bg-red-50/70 border-red-300 ring-1 ring-red-400 shadow-sm"
                        : isHigh
                        ? "bg-amber-50/60 border-amber-300 shadow-sm"
                        : "bg-blue-50/40 border-blue-200 shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      {/* Cột Trái: Icon & Nội dung */}
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">
                          {isUrgent ? (
                            <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                          ) : isHigh ? (
                            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                              <Clock className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                              <Bell className="w-4 h-4" />
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4
                              className={`text-sm font-bold ${
                                notif.is_resolved
                                  ? "line-through text-slate-400"
                                  : isUrgent
                                  ? "text-red-950"
                                  : "text-slate-900"
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <PriorityBadge priority={notif.priority} />
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600" title="Chưa đọc" />
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                          {/* Gợi ý hành động */}
                          {notif.suggested_action && (
                            <div className="pt-1 text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px]">
                                Gợi ý
                              </span>
                              <span>{notif.suggested_action}</span>
                            </div>
                          )}

                          {/* Thông tin số dư và phạt */}
                          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>
                              Khách: <strong>{notif.company_name}</strong>
                            </span>
                            {notif.remaining_balance ? (
                              <span>
                                Dư nợ: <strong className="text-slate-800">{formatVNCurrency(notif.remaining_balance)}</strong>
                              </span>
                            ) : null}
                            {notif.estimated_penalty ? (
                              <span>
                                Phạt tạm tính:{" "}
                                <strong className="text-amber-600">{formatVNCurrency(notif.estimated_penalty)}</strong>
                              </span>
                            ) : null}
                            <span className="text-[11px] text-slate-400">
                              Ngày phát sinh: {formatVNDate(notif.milestone_date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cột Phải: Các nút thao tác */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {!notif.is_read && (
                          <button
                            onClick={() => markAsRead(notif.dedup_key)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            Đã đọc
                          </button>
                        )}

                        <button
                          onClick={() => toggleResolved(notif.dedup_key)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            notif.is_resolved
                              ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{notif.is_resolved ? "Mở lại" : "Đã xử lý"}</span>
                        </button>

                        <Link
                          href="/contacts"
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
                          title="Ghi nhật ký liên hệ khách hàng"
                        >
                          Ghi liên hệ &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  switch (priority) {
    case "urgent":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
          KHẨN CẤP
        </span>
      );
    case "high":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">
          ƯU TIÊN CAO
        </span>
      );
    case "medium":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
          TRUNG BÌNH
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
          THẤP
        </span>
      );
  }
}
