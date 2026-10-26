import { useCallback, useEffect, useState } from "react";
import { supabase, errorMessage } from "./db";
import {
  SELECT_COMPANIES,
  SELECT_CONTRACTS,
  SELECT_INVOICES,
  SELECT_PAYMENTS,
  SELECT_CONTACTS,
  SELECT_PROMISES,
  SELECT_SETTINGS,
  toCompany,
  toContract,
  toFreshInvoice,
  toPayment,
  toContact,
  toPromise,
  toSettings,
} from "./db-mappers";
import {
  AppSettings,
  Company,
  ContactHistory,
  Contract,
  Invoice,
  Payment,
  PaymentPromise,
} from "@/types/debt";

const ALL = ["invoices", "companies", "contracts", "payments", "contacts", "promises", "settings"];

export function useDebtData(tables?: string[]) {
  const wanted = tables && tables.length ? tables : ALL;
  const key = wanted.join(",");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contacts, setContacts] = useState<ContactHistory[]>([]);
  const [promises, setPromises] = useState<PaymentPromise[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const want = (t: string) => key.split(",").includes(t);
    const problems: string[] = [];

    const run = async (name: string, table: string, select: string, apply: (rows: any[]) => void) => {
      if (!want(name)) return;
      const { data, error } = await supabase.from(table).select(select);
      if (error) problems.push(`${name}: ${errorMessage(error)}`);
      else apply(data || []);
    };

    try {
      await Promise.all([
        run("companies", "companies", SELECT_COMPANIES, (r) => setCompanies(r.map(toCompany))),
        run("contracts", "contracts", SELECT_CONTRACTS, (r) => setContracts(r.map(toContract))),
        run("invoices", "invoices", SELECT_INVOICES, (r) => setInvoices(r.map((x) => toFreshInvoice(x)))),
        run("payments", "payments", SELECT_PAYMENTS, (r) => setPayments(r.map(toPayment))),
        run("contacts", "contact_histories", SELECT_CONTACTS, (r) => setContacts(r.map(toContact))),
        run("promises", "payment_promises", SELECT_PROMISES, (r) => setPromises(r.map(toPromise))),
        run("settings", "app_settings", SELECT_SETTINGS, (r) => setSettings(r[0] ? toSettings(r[0]) : null)),
      ]);
    } catch (err) {
      problems.push(errorMessage(err));
    }

    setErrors(problems.length ? problems.join(" | ") : null);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    invoices,
    companies,
    contracts,
    payments,
    contacts,
    promises,
    settings,
    loading,
    errors,
    reload,
    refresh: reload,
  };
}

export default useDebtData;