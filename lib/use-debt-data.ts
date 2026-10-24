import { useState, useEffect } from 'react';
import { supabase } from './db';

// Hàm nhận tham số flexible để khớp 100% với page.tsx
export function useDebtData(tables?: any) {
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

export default useDebtData;