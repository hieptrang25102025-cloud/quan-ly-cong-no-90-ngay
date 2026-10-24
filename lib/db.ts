import { supabase } from './supabase';
import { Invoice, Contract, Customer, Payment } from '@/types/debt';

// --- QUẢN LÝ HÓA ĐƠN & SUPABASE ---
export async function createInvoice(invoice: Partial<Invoice>) {
  const { data, error } = await supabase
    .from('invoices')
    .insert([invoice])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>) {
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export const errorMessage = (err: any) => err?.message || 'Đã có lỗi xảy ra';