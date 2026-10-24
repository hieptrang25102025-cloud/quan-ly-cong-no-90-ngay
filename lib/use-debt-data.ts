import { useState, useEffect } from 'react';
import { supabase } from './db';

export function useDebtData() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    try {
      setLoading(true);
      setErrors(null);
      
      const { data: invData, error: invError } = await supabase.from('invoices').select('*');
      if (invError) throw invError;
      setInvoices(invData || []);

      // Lấy thêm thông tin công ty và hợp đồng nếu có bảng tương ứng
      const { data: compData } = await supabase.from('companies').select('*');
      setCompanies(compData || []);

      const { data: contractData } = await supabase.from('contracts').select('*');
      setContracts(contractData || []);

    } catch (err: any) {
      console.error('Lỗi tải dữ liệu:', err);
      setErrors(err?.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  return { 
    invoices, 
    companies, 
    contracts, 
    loading, 
    errors, 
    reload: fetchAllData,
    refresh: fetchAllData 
  };
}