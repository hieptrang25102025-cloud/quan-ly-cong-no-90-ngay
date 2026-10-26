import { createClient } from "@supabase/supabase-js";
import { Invoice, PaymentPromise, AppSettings } from "@/types/debt";
import {
  SELECT_INVOICES,
  SELECT_CONTRACTS,
  SELECT_COMPANIES,
  SELECT_PAYMENTS,
  SELECT_CONTACTS,
  SELECT_PROMISES,
  SELECT_SETTINGS,
  CompanyInput,
  ContractInput,
  NewInvoiceInput,
  InvoiceChanges,
  NewPaymentInput,
  NewContactInput,
  NewPromiseInput,
  buildNewInvoice,
  invoiceToInsertRow,
  invoiceChangesToRow,
  invoiceDerivedPatch,
  toInvoice,
  toFreshInvoice,
  companyToRow,
  contractToRow,
  paymentToRow,
  contactToRow,
  promiseToRow,
  settingsToRow,
} from "./db-mappers";
import { recalcInvoice } from "./invoice-calc";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const errorMessage = (err: any): string =>
  err?.message || (typeof err === "string" ? err : "Đã có lỗi xảy ra");

// ---------- Công ty ----------
export async function createCompany(input: CompanyInput) {
  const { data, error } = await supabase.from("companies").insert([companyToRow(input)]).select().single();
  if (error) throw error;
  return data;
}
export async function updateCompany(id: string, input: CompanyInput) {
  const { error } = await supabase.from("companies").update(companyToRow(input)).eq("id", id);
  if (error) throw error;
}
export async function deleteCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Hợp đồng ----------
export async function createContract(input: ContractInput) {
  const { data, error } = await supabase.from("contracts").insert([contractToRow(input)]).select().single();
  if (error) throw error;
  return data;
}
export async function updateContract(id: string, input: ContractInput) {
  const { error } = await supabase.from("contracts").update(contractToRow(input)).eq("id", id);
  if (error) throw error;
}
export async function deleteContract(id: string) {
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Hóa đơn ----------
export async function createInvoice(input: NewInvoiceInput): Promise<Invoice> {
  const draft = buildNewInvoice(input);
  const { data, error } = await supabase
    .from("invoices")
    .insert([invoiceToInsertRow(draft)])
    .select(SELECT_INVOICES)
    .single();
  if (error) throw error;
  return toFreshInvoice(data);
}

export async function updateInvoice(invoice: Invoice, changes: InvoiceChanges): Promise<Invoice> {
  const merged = recalcInvoice({ ...invoice, ...changes } as Invoice);
  const patch = { ...invoiceChangesToRow(changes), ...invoiceDerivedPatch(merged) };
  const { error } = await supabase.from("invoices").update(patch).eq("id", invoice.id);
  if (error) throw error;
  return merged;
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/** Cộng lại các khoản đã thanh toán rồi cập nhật số dư/phạt/trạng thái của hóa đơn. */
export async function syncInvoicePayments(invoiceId: string): Promise<Invoice> {
  const { data: invRow, error } = await supabase
    .from("invoices")
    .select(SELECT_INVOICES)
    .eq("id", invoiceId)
    .single();
  if (error) throw error;
  const { data: pays, error: payErr } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);
  if (payErr) throw payErr;
  const paid = (pays || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const inv = recalcInvoice({ ...toInvoice(invRow), paid_amount: paid });
  const { error: upErr } = await supabase
    .from("invoices")
    .update(invoiceDerivedPatch(inv))
    .eq("id", invoiceId);
  if (upErr) throw upErr;
  return inv;
}

// ---------- Thanh toán ----------
export async function createPayment(input: NewPaymentInput) {
  const { data, error } = await supabase.from("payments").insert([paymentToRow(input)]).select().single();
  if (error) throw error;
  await syncInvoicePayments(input.invoice_id);
  return data;
}
export async function deletePayment(id: string) {
  const { data: pay } = await supabase.from("payments").select("invoice_id").eq("id", id).single();
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
  if (pay?.invoice_id) await syncInvoicePayments(pay.invoice_id);
}

// ---------- Liên hệ & lịch hẹn ----------
export async function createContact(input: NewContactInput) {
  const { data, error } = await supabase.from("contact_histories").insert([contactToRow(input)]).select().single();
  if (error) throw error;
  return data;
}
export async function deleteContact(id: string) {
  const { error } = await supabase.from("contact_histories").delete().eq("id", id);
  if (error) throw error;
}
export async function createPromise(input: NewPromiseInput) {
  const { data, error } = await supabase.from("payment_promises").insert([promiseToRow(input)]).select().single();
  if (error) throw error;
  return data;
}
export async function updatePromiseStatus(id: string, status: PaymentPromise["status"]) {
  const { error } = await supabase
    .from("payment_promises")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ---------- Cài đặt ----------
export async function saveSettings(settings: AppSettings) {
  const row = settingsToRow(settings);
  const query = settings.id
    ? supabase.from("app_settings").update(row).eq("id", settings.id)
    : supabase.from("app_settings").insert([row]);
  const { error } = await query;
  if (error) throw error;
}

export {
  SELECT_COMPANIES,
  SELECT_CONTRACTS,
  SELECT_INVOICES,
  SELECT_PAYMENTS,
  SELECT_CONTACTS,
  SELECT_PROMISES,
  SELECT_SETTINGS,
};