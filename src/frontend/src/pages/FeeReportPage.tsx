import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Printer, TrendingUp } from "lucide-react";
import { useBackend } from "../hooks/useBackend";
import type { Student, Payment } from "../backend";
import { formatCurrency, formatDate } from "../utils/constants";

interface ReportRow {
  studentName: string;
  studentClass: string;
  section: string;
  amountPaid: number;
  paymentDate: bigint;
  paymentMode: string;
}

export default function FeeReportPage() {
  const { backend } = useBackend();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!backend) { toast.error("Backend not ready"); return; }
    setLoading(true);
    setGenerated(false);
    try {
      const allStudents: Student[] = await backend.getAllStudents();
      const selectedMs = new Date(selectedDate).setHours(0, 0, 0, 0);
      const rows: ReportRow[] = [];
      let allTimeTotal = 0;

      allStudents.forEach((student) => {
        student.payments.forEach((payment: Payment) => {
          const paymentDate = new Date(Number(payment.paymentDate));
          const paymentDayMs = paymentDate.setHours(0, 0, 0, 0);

          allTimeTotal += payment.amountPaid;

          if (paymentDayMs === selectedMs) {
            rows.push({
              studentName: student.name,
              studentClass: student.studentClass,
              section: student.section,
              amountPaid: payment.amountPaid,
              paymentDate: payment.paymentDate,
              paymentMode: payment.paymentMode,
            });
          }
        });
      });

      rows.sort((a, b) => Number(b.paymentDate - a.paymentDate));
      setReportRows(rows);
      setGrandTotal(allTimeTotal);
      setGenerated(true);
      toast.success(`Report generated: ${rows.length} payment(s) found`);
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [backend, selectedDate]);

  const dailyTotal = reportRows.reduce((s, r) => s + r.amountPaid, 0);

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h2 className="text-2xl font-bold text-foreground">Fee Report</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Daily and all-time fee collection summary</p>
      </div>

      {/* Date picker */}
      <div className="no-print rounded-xl border border-border bg-card shadow-xs p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-40">
            <label htmlFor="report-date" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Report Date
            </label>
            <input
              id="report-date"
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setGenerated(false); }}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs text-emerald-700 uppercase font-semibold tracking-wide">
                Daily Total — {new Date(selectedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
              <p className="text-3xl font-extrabold text-emerald-700 mt-2">{formatCurrency(dailyTotal)}</p>
              <p className="text-xs text-emerald-600 mt-1">{reportRows.length} transaction(s)</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-blue-700 uppercase font-semibold tracking-wide">Grand Total (All Time)</p>
              </div>
              <p className="text-3xl font-extrabold text-blue-700 mt-2">{formatCurrency(grandTotal)}</p>
            </div>
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
            <h1 className="text-xl font-bold">Global Pride International School</h1>
            <p className="text-sm text-gray-600">Academic Year 2026–2027</p>
            <p className="text-sm font-medium mt-1">
              Fee Collection Report — {new Date(selectedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
            <p className="text-sm mt-1">Daily Total: {formatCurrency(dailyTotal)} | Grand Total: {formatCurrency(grandTotal)}</p>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground">
                Transactions for {new Date(selectedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
              </h4>
            </div>

            {reportRows.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground text-sm">No payments recorded for this date.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/10 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Class</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Section</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mode</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportRows.map((row, idx) => (
                      <tr key={`${row.studentName}-${row.paymentDate.toString()}`} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{row.studentName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.studentClass}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {row.section}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(row.amountPaid)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                            {row.paymentMode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(row.paymentDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/10">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-right text-foreground">
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
          <p className="text-muted-foreground text-sm">Select a date and click <strong>Generate Report</strong></p>
        </div>
      )}
    </div>
  );
}
