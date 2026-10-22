import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { generateDebtWorkbook } from "@/lib/excel-export";
import {
  INITIAL_COMPANIES,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_CONTACTS,
  INITIAL_PROMISES,
} from "@/lib/data-store";

export async function GET() {
  try {
    const wb = generateDebtWorkbook({
      companies: INITIAL_COMPANIES,
      invoices: INITIAL_INVOICES,
      payments: INITIAL_PAYMENTS,
      contacts: INITIAL_CONTACTS,
      promises: INITIAL_PROMISES,
    });

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Bao_Cao_Cong_No_90_Ngay_${new Date().toISOString().split("T")[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
