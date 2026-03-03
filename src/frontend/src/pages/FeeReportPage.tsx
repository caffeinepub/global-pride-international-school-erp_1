import {
  Banknote,
  Building2,
  Bus,
  CalendarDays,
  Info,
  Loader2,
  Printer,
  Search,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  MONTHS,
  formatCurrency,
  formatDate,
  getTodayDateString,
  parseDateString,
} from "../utils/constants";
import { getAllStudents } from "../utils/localStore";
import type { Payment, Student } from "../utils/localStore";
import type { TransportPaymentLocalRecord } from "./TransportPage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportRow {
  studentName: string;
  studentClass: string;
  section: string;
  amountPaid: number;
  paymentDate: number;
  paymentMode: string;
  paymentId: number;
}

function generateReceiptNo(paymentId: number): string {
  const year = new Date().getFullYear();
  return `GPIS-${year}-${String(paymentId).padStart(5, "0")}`;
}

type TabId = "fee" | "attendance" | "transport";

// ─── localStorage helper ──────────────────────────────────────────────────────

function getTransportPaymentsByDate(
  dateStr: string,
): TransportPaymentLocalRecord[] {
  try {
    const all: TransportPaymentLocalRecord[] = JSON.parse(
      localStorage.getItem("transport_payments") || "[]",
    );
    const target = parseDateString(dateStr).toDateString();
    return all.filter((r) => new Date(r.paymentDate).toDateString() === target);
  } catch {
    return [];
  }
}

function getAllTransportPaymentsForMonth(
  month: number,
  year: number,
): TransportPaymentLocalRecord[] {
  try {
    const all: TransportPaymentLocalRecord[] = JSON.parse(
      localStorage.getItem("transport_payments") || "[]",
    );
    return all.filter((r) => r.month === month && r.year === year);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function FeeReportPage() {
  // Active tab
  const [activeTab, setActiveTab] = useState<TabId>("fee");

  // ── Fee Payments tab ──
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [loading, setLoading] = useState(false);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [generated, setGenerated] = useState(false);

  // ── Attendance tab ──
  const [attDate, setAttDate] = useState(getTodayDateString);

  // ── Transport Payments tab ──
  const currentDate = new Date();
  const [transMonth, setTransMonth] = useState(currentDate.getMonth() + 1);
  const [transYear, setTransYear] = useState(currentDate.getFullYear());
  const [transMonthGenerated, setTransMonthGenerated] = useState(false);
  const [transMonthRows, setTransMonthRows] = useState<
    TransportPaymentLocalRecord[]
  >([]);

  // ── Transport by Date (bottom section of Fee tab) ──
  const [transByDate, setTransByDate] = useState(getTodayDateString);
  const [transByDateRows, setTransByDateRows] = useState<
    TransportPaymentLocalRecord[]
  >([]);
  const [transByDateShown, setTransByDateShown] = useState(false);
  const [transSearch, setTransSearch] = useState("");

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleGenerate = () => {
    setLoading(true);
    setGenerated(false);
    try {
      const allStudents: Student[] = getAllStudents();
      const selectedMs = parseDateString(selectedDate).setHours(0, 0, 0, 0);
      const rows: ReportRow[] = [];
      let allTimeTotal = 0;

      for (const student of allStudents) {
        for (const payment of student.payments as Payment[]) {
          const paymentDate = new Date(payment.paymentDate);
          const paymentDayMs = new Date(paymentDate).setHours(0, 0, 0, 0);

          allTimeTotal += payment.amountPaid;

          if (paymentDayMs === selectedMs) {
            rows.push({
              studentName: student.name,
              studentClass: student.studentClass,
              section: student.section,
              amountPaid: payment.amountPaid,
              paymentDate: payment.paymentDate,
              paymentMode: payment.paymentMode,
              paymentId: payment.id,
            });
          }
        }
      }

      rows.sort((a, b) => b.paymentDate - a.paymentDate);
      setReportRows(rows);
      setGrandTotal(allTimeTotal);
      setGenerated(true);
      toast.success(`Report generated: ${rows.length} payment(s) found`);
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTransportMonth = () => {
    const rows = getAllTransportPaymentsForMonth(transMonth, transYear);
    setTransMonthRows(rows);
    setTransMonthGenerated(true);
    toast.success(
      `${rows.length} transport payment(s) found for ${MONTHS[transMonth - 1]} ${transYear}`,
    );
  };

  const handleShowTransportByDate = () => {
    const rows = getTransportPaymentsByDate(transByDate);
    setTransByDateRows(rows);
    setTransByDateShown(true);
  };

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const dailyTotal = reportRows.reduce((s, r) => s + r.amountPaid, 0);
  const cashTotal = reportRows
    .filter((r) => r.paymentMode === "Cash")
    .reduce((s, r) => s + r.amountPaid, 0);
  const upiTotal = reportRows
    .filter((r) => r.paymentMode === "UPI")
    .reduce((s, r) => s + r.amountPaid, 0);
  const bankTransferTotal = reportRows
    .filter((r) => r.paymentMode === "BankTransfer")
    .reduce((s, r) => s + r.amountPaid, 0);

  const filteredTransByDate = transByDateRows.filter(
    (r) =>
      !transSearch.trim() ||
      r.studentName.toLowerCase().includes(transSearch.toLowerCase()),
  );

  // ─── Tab button helper ────────────────────────────────────────────────────────

  const tabClass = (id: TabId) =>
    `flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
      activeTab === id
        ? "text-white shadow-sm"
        : "text-muted-foreground hover:bg-muted/40 border border-border"
    }`;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h2 className="text-2xl font-bold text-foreground">Fee Report</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Daily fee collection, attendance overview, and transport payment
          history
        </p>
      </div>

      {/* Tab bar */}
      <div className="no-print flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("fee")}
          className={tabClass("fee")}
          style={
            activeTab === "fee"
              ? { background: "oklch(0.48 0.15 155)" }
              : undefined
          }
        >
          <Banknote className="h-4 w-4" />
          Fee Payments
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={tabClass("attendance")}
          style={
            activeTab === "attendance"
              ? { background: "oklch(0.48 0.15 155)" }
              : undefined
          }
        >
          <CalendarDays className="h-4 w-4" />
          Attendance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("transport")}
          className={tabClass("transport")}
          style={
            activeTab === "transport"
              ? { background: "oklch(0.48 0.15 155)" }
              : undefined
          }
        >
          <Bus className="h-4 w-4" />
          Transport Payments
        </button>
      </div>

      {/* ════════════════════ TAB: FEE PAYMENTS ════════════════════ */}
      {activeTab === "fee" && (
        <>
          {/* Date picker */}
          <div className="no-print rounded-xl border border-border bg-card shadow-xs p-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-40">
                <label
                  htmlFor="report-date"
                  className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                >
                  Report Date
                </label>
                <input
                  id="report-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setGenerated(false);
                  }}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: "oklch(0.48 0.15 155)" }}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate Report
              </button>
            </div>
          </div>

          {generated && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 xl:col-span-2">
                  <p className="text-xs text-emerald-700 uppercase font-semibold tracking-wide">
                    Daily Total —{" "}
                    {parseDateString(selectedDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-3xl font-extrabold text-emerald-700 mt-2">
                    {formatCurrency(dailyTotal)}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {reportRows.length} transaction(s)
                  </p>
                </div>
                {/* Cash */}
                <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-green-700" />
                    <p className="text-xs text-green-700 uppercase font-semibold tracking-wide">
                      Cash
                    </p>
                  </div>
                  <p className="text-2xl font-extrabold text-green-700">
                    {formatCurrency(cashTotal)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {reportRows.filter((r) => r.paymentMode === "Cash").length}{" "}
                    txn(s)
                  </p>
                </div>
                {/* UPI */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-4 w-4 text-blue-700" />
                    <p className="text-xs text-blue-700 uppercase font-semibold tracking-wide">
                      UPI
                    </p>
                  </div>
                  <p className="text-2xl font-extrabold text-blue-700">
                    {formatCurrency(upiTotal)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {reportRows.filter((r) => r.paymentMode === "UPI").length}{" "}
                    txn(s)
                  </p>
                </div>
                {/* Bank Transfer */}
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-purple-700" />
                    <p className="text-xs text-purple-700 uppercase font-semibold tracking-wide">
                      Bank Transfer
                    </p>
                  </div>
                  <p className="text-2xl font-extrabold text-purple-700">
                    {formatCurrency(bankTransferTotal)}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {
                      reportRows.filter((r) => r.paymentMode === "BankTransfer")
                        .length
                    }{" "}
                    txn(s)
                  </p>
                </div>
              </div>

              {/* Grand Total */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-blue-700 uppercase font-semibold tracking-wide">
                    Grand Total (All Time)
                  </p>
                </div>
                <p className="text-3xl font-extrabold text-blue-700 mt-2">
                  {formatCurrency(grandTotal)}
                </p>
              </div>

              {/* Print button */}
              <div className="no-print flex justify-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print Report
                </button>
              </div>

              {/* Print header - visible on print */}
              <div className="hidden print:block text-center border-b pb-4 mb-4">
                <h1 className="text-xl font-bold">
                  Global Pride International School
                </h1>
                <p className="text-sm text-gray-600">Academic Year 2026–2027</p>
                <p className="text-sm font-medium mt-1">
                  Fee Collection Report —{" "}
                  {parseDateString(selectedDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm mt-1">
                  Daily Total: {formatCurrency(dailyTotal)} | Grand Total:{" "}
                  {formatCurrency(grandTotal)}
                </p>
                <div className="flex justify-center gap-6 mt-2 text-sm">
                  <span>
                    Cash: <strong>{formatCurrency(cashTotal)}</strong>
                  </span>
                  <span>
                    UPI: <strong>{formatCurrency(upiTotal)}</strong>
                  </span>
                  <span>
                    Bank Transfer:{" "}
                    <strong>{formatCurrency(bankTransferTotal)}</strong>
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h4 className="text-sm font-semibold text-foreground">
                    Transactions for{" "}
                    {parseDateString(selectedDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </h4>
                </div>

                {reportRows.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-muted-foreground text-sm">
                      No payments recorded for this date.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/10 border-b border-border">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            #
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Bill No.
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Student
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Class
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Section
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Amount
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Mode
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {reportRows.map((row, idx) => (
                          <tr
                            key={`${row.studentName}-${row.paymentDate.toString()}`}
                            className="hover:bg-muted/10 transition-colors"
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs font-bold text-primary">
                              {generateReceiptNo(row.paymentId)}
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">
                              {row.studentName}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {row.studentClass}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {row.section}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-emerald-700">
                              {formatCurrency(row.amountPaid)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                                {row.paymentMode}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {formatDate(row.paymentDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-border bg-muted/10">
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-3 text-sm font-semibold text-right text-foreground"
                          >
                            Daily Total
                          </td>
                          <td className="px-4 py-3 font-extrabold text-emerald-700 text-base">
                            {formatCurrency(dailyTotal)}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {!generated && !loading && (
            <div className="rounded-xl border border-border bg-card shadow-xs py-16 text-center">
              <p className="text-muted-foreground text-sm">
                Select a date and click <strong>Generate Report</strong>
              </p>
            </div>
          )}

          {/* ── Transport Payment History by Date (bottom of fee tab) ── */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div
              className="px-5 py-4 border-b border-border"
              style={{ background: "oklch(0.96 0.025 155)" }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Bus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Transport Payment History by Date
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                View transport payments recorded on a specific date
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label
                    htmlFor="trans-date"
                    className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                  >
                    Date
                  </label>
                  <input
                    id="trans-date"
                    type="date"
                    value={transByDate}
                    onChange={(e) => {
                      setTransByDate(e.target.value);
                      setTransByDateShown(false);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleShowTransportByDate}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ background: "oklch(0.48 0.15 155)" }}
                >
                  Show
                </button>
              </div>

              {transByDateShown && (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={transSearch}
                      onChange={(e) => setTransSearch(e.target.value)}
                      placeholder="Search by student name..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {filteredTransByDate.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-muted-foreground text-sm">
                        No transport payments found for{" "}
                        {parseDateString(transByDate).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                        .
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/10 border-b border-border">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Bill No.
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Student
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Class
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Month/Year
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredTransByDate.map((r, idx) => (
                            <tr
                              key={`${r.billNo}-${idx}`}
                              className="hover:bg-muted/10 transition-colors"
                            >
                              <td className="px-4 py-3 font-mono text-xs font-bold text-primary">
                                {r.billNo}
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground">
                                {r.studentName}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {r.studentClass || "—"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {MONTHS[r.month - 1]} {r.year}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-700">
                                {formatCurrency(r.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-border bg-muted/10">
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-3 text-sm font-semibold text-right text-foreground"
                            >
                              Total
                            </td>
                            <td className="px-4 py-3 font-extrabold text-emerald-700">
                              {formatCurrency(
                                filteredTransByDate.reduce(
                                  (s, r) => s + r.amount,
                                  0,
                                ),
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </>
              )}

              {!transByDateShown && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    Select a date and click <strong>Show</strong> to view
                    transport payments
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ════════════════════ TAB: ATTENDANCE ════════════════════ */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          {/* Date picker */}
          <div className="rounded-xl border border-border bg-card shadow-xs p-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-40">
                <label
                  htmlFor="att-report-date"
                  className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                >
                  Date
                </label>
                <input
                  id="att-report-date"
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 flex items-start gap-4">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-800 mb-1">
                Attendance Data is Permanently Stored in Your Browser
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                Attendance records for{" "}
                <strong>
                  {parseDateString(attDate).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>{" "}
                are stored in localStorage and will persist across browser
                sessions. Every attendance session saved from the Attendance
                page is preserved.
              </p>
              <ul className="text-xs text-blue-600 space-y-1 mb-4">
                <li>
                  • Data is stored per class-section combination with a
                  timestamp
                </li>
                <li>• All present/absent statuses are recorded per date</li>
                <li>
                  • Records are accessible any time via the Attendance page by
                  selecting the appropriate class and date
                </li>
              </ul>
              <button
                type="button"
                onClick={() => {
                  (
                    document.querySelector(
                      '[data-page="attendance"]',
                    ) as HTMLElement
                  )?.click();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ background: "oklch(0.48 0.15 155)" }}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Go to Attendance Page
              </button>
            </div>
          </div>

          {/* How to view */}
          <div className="rounded-xl border border-border bg-card shadow-xs p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              How to View Attendance for a Specific Date
            </h4>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                Navigate to the{" "}
                <strong className="text-foreground">Attendance</strong> page
                from the sidebar.
              </li>
              <li>
                Select the <strong className="text-foreground">Class</strong>{" "}
                and <strong className="text-foreground">Section</strong> you
                want to review.
              </li>
              <li>
                Set the <strong className="text-foreground">Date</strong> to the
                date you want to view.
              </li>
              <li>
                Click <strong className="text-foreground">Load Students</strong>{" "}
                — the students will load and you can re-mark attendance or view
                historical data.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB: TRANSPORT PAYMENTS ════════════════════ */}
      {activeTab === "transport" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div
              className="px-5 py-4 border-b border-border"
              style={{ background: "oklch(0.96 0.025 155)" }}
            >
              <h3 className="text-sm font-semibold text-foreground">
                Transport Payments by Month
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a month and year to view all recorded transport payments.
                Payments are stored permanently in this browser.
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label
                    htmlFor="trans-month"
                    className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                  >
                    Month
                  </label>
                  <select
                    id="trans-month"
                    value={transMonth}
                    onChange={(e) => {
                      setTransMonth(Number(e.target.value));
                      setTransMonthGenerated(false);
                    }}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="trans-year"
                    className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                  >
                    Year
                  </label>
                  <select
                    id="trans-year"
                    value={transYear}
                    onChange={(e) => {
                      setTransYear(Number(e.target.value));
                      setTransMonthGenerated(false);
                    }}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateTransportMonth}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ background: "oklch(0.48 0.15 155)" }}
                >
                  Generate
                </button>
              </div>

              {transMonthGenerated && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs text-emerald-700 uppercase font-semibold tracking-wide">
                        Total Collected
                      </p>
                      <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                        {formatCurrency(
                          transMonthRows.reduce((s, r) => s + r.amount, 0),
                        )}
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {transMonthRows.length} payment(s)
                      </p>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <p className="text-xs text-blue-700 uppercase font-semibold tracking-wide">
                        Month / Year
                      </p>
                      <p className="text-xl font-extrabold text-blue-700 mt-1">
                        {MONTHS[transMonth - 1]} {transYear}
                      </p>
                    </div>
                  </div>

                  {transMonthRows.length === 0 ? (
                    <div className="py-12 text-center rounded-xl border border-border">
                      <p className="text-muted-foreground text-sm">
                        No transport payments recorded for{" "}
                        {MONTHS[transMonth - 1]} {transYear}.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Payments are stored locally when recorded via the
                        Transport Billing section.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/10 border-b border-border">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              #
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Bill No.
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Student Name
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Class
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Transport Option
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Payment Date
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {transMonthRows.map((r, idx) => (
                            <tr
                              key={`${r.billNo}-${idx}`}
                              className="hover:bg-muted/10 transition-colors"
                            >
                              <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-primary">
                                {r.billNo}
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground">
                                {r.studentName}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {r.studentClass || "—"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                                  {r.transportOption}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {new Date(r.paymentDate).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-700">
                                {formatCurrency(r.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-border bg-muted/10">
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-3 text-sm font-semibold text-right text-foreground"
                            >
                              Monthly Total
                            </td>
                            <td className="px-4 py-3 font-extrabold text-emerald-700 text-base">
                              {formatCurrency(
                                transMonthRows.reduce(
                                  (s, r) => s + r.amount,
                                  0,
                                ),
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </>
              )}

              {!transMonthGenerated && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground text-sm">
                    Select a month and year, then click{" "}
                    <strong>Generate</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
