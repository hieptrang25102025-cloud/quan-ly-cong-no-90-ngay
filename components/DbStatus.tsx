import React from "react";

type DbStatusProps = {
  loading?: boolean;
  errors?: string | null;
  onRetry?: () => void | Promise<void>;
};

export function DbStatus({ loading = false, errors = null, onRetry }: DbStatusProps) {
  if (loading) {
    return (
      <div className="p-2 text-sm text-blue-600 bg-blue-50 rounded-md inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (errors) {
    return (
      <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center justify-between gap-3">
        <span>Không tải được dữ liệu: {errors}</span>
        {onRetry && (
          <button
            onClick={() => onRetry()}
            className="px-3 py-1 text-xs font-semibold bg-red-100 hover:bg-red-200 rounded"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-2 text-sm text-green-600 bg-green-50 rounded-md inline-flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
      Kết nối Supabase sẵn sàng
    </div>
  );
}

export default DbStatus;