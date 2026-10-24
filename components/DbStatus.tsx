import React from 'react';

export default function DbStatus() {
  return (
    <div className="p-2 text-sm text-green-600 bg-green-50 rounded-md inline-flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
      Kết nối Supabase sẵn sàng
    </div>
  );
}