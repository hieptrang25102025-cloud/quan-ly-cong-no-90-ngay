import { useState, useEffect } from 'react';
import { supabase } from './db';

export function useDebtData() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('invoices').select('*');
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  }

  return { invoices, loading, refresh: fetchInvoices };
}