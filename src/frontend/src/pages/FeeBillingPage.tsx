import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Search, Loader2, Printer, CheckCircle } from "lucide-react";
import { useBackend } from "../hooks/useBackend";
import { FeeCategory, PaymentMode } from "../backend";
import type { Student, Payment } from "../backend";
import { FEE_CATEGORY_LABELS, formatCurrency, formatDate, getInstallmentAmount, CLASSES, SECTIONS } from "../utils/constants";

const PAYMENT_MODES = [
  { value: PaymentMode.Cash, label: "Cash" },
  { value: PaymentMode.UPI, label: "UPI" },
  { value: PaymentMode.BankTransfer, label: "Bank Transfer" },
];

function generateReceiptNo(paymentId: bigint): string {
  const year = new Date().getFullYear();
  const paddedId = String(Number(paymentId)).padStart(5, "0");
  return `GPIS-${year}-${paddedId}`;
}

export default function FeeBillingPage() {
  const { backend, isFetching: actorFetching } = useBackend();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FeeCategory>(FeeCategory.OTP);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.Cash);
  const [paying, setPaying] = useState(false);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [lastReceiptNo, setLastReceiptNo] = useState<string>("");

  const loadStudents = useCallback(async () => {
    if (!backend) return;
    try {
      const data = await backend.getAllStudents();
      setStudents(data);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  }, [backend]);

  useEffect(() => {
    if (!actorFetching) loadStudents();
  }, [loadStudents, actorFetching]);

  const filteredStudents = useMemo(() => {
    let result = students;
    if (filterClass) result = result.filter((s) => s.studentClass === filterClass);
    if (filterSection) result = result.filter((s) => s.section === filterSection);
    if (!searchQuery.trim()) return result.slice(0, 8);
    return result.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ).slice(0, 8);
  }, [students, searchQuery, filterClass, filterSection]);

  const totalPaid = useMemo(
    () => selectedStudent?.payments.reduce((s, p) => s + p.amountPaid, 0) ?? 0,
    [selectedStudent],
  );
  const remaining = useMemo(
    () => Math.max(0, (selectedStudent?.finalFee ?? 0) - totalPaid),
    [selectedStudent, totalPaid],
  );

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setShowDropdown(false);
    setLastPayment(null);
    setLastReceiptNo("");
    // Auto-fill fee category and amount from student data
    setSelectedCategory(student.feePaymentCategory);
    setAmount(String(getInstallmentAmount(student.finalFee, student.feePaymentCategory)));
  };

  const handlePay = async () => {
    if (!backend) { toast.error("Backend not ready"); return; }
    if (!selectedStudent) { toast.error("No student selected"); return; }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) { toast.error("Enter a valid amount"); return; }
    setPaying(true);
    try {
      const dateTs = BigInt(Date.now());
      const id = await backend.addFeePayment(
        selectedStudent.id,
        amountNum,
        dateTs,
        paymentMode,
        selectedCategory,
      );
      const receiptNo = generateReceiptNo(id);
      setLastReceiptNo(receiptNo);
      toast.success(`Payment of ${formatCurrency(amountNum)} recorded! Receipt: ${receiptNo}`);
      // Refresh student data
      const refreshed = await backend.getStudentById(selectedStudent.id);
      if (refreshed) {
        setSelectedStudent(refreshed);
        const newPayment = refreshed.payments.find((p) => p.id === id);
        if (newPayment) setLastPayment(newPayment);
        // Update in the list
        setStudents((prev) => prev.map((s) => (s.id === refreshed.id ? refreshed : s)));
      }
      setAmount("");
    } catch {
      toast.error("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const handlePrint = () => {
    if (!selectedStudent || !lastPayment) return;
    window.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Fee / Billing</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Collect and record student fee payments</p>
      </div>

      {/* Student Search */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Select Student</h3>
        {/* Class/Section filter */}
        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex-1 min-w-36">
            <label htmlFor="fb-class" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Filter by Class</label>
            <select
              id="fb-class"
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setShowDropdown(true); }}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Classes</option>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-32">
            <label htmlFor="fb-section" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Filter by Section</label>
            <select
              id="fb-section"
              value={filterSection}
              onChange={(e) => { setFilterSection(e.target.value); setShowDropdown(true); }}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Sections</option>
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search student by name..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Search student"
          />
          {showDropdown && searchQuery && filteredStudents.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              {filteredStudents.map((s) => (
                <button
                  key={s.id.toString()}
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
                  onClick={() => handleSelectStudent(s)}
                >
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.studentClass} – {s.section}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {loadingStudents && <p className="text-xs text-muted-foreground mt-2">Loading students...</p>}
      </div>

      {/* Student Info + Payment */}
      {selectedStudent && (
        <>
          {/* Student Info Card */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div
              className="px-5 py-4 border-b border-border"
              style={{ background: "oklch(0.96 0.025 155)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground">{selectedStudent.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.studentClass} – Section {selectedStudent.section} · Father: {selectedStudent.fatherName}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {selectedStudent.feePaymentCategory}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="px-5 py-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Fee</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(selectedStudent.finalFee)}</p>
              </div>
              <div className="px-5 py-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Paid</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="px-5 py-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
                <p className={`text-xl font-bold mt-1 ${remaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {remaining > 0 ? formatCurrency(remaining) : "Paid ✓"}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="rounded-xl border border-border bg-card shadow-xs p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Record Payment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label htmlFor="fee-cat" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Fee Category
                </label>
                <select
                  id="fee-cat"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as FeeCategory)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {Object.entries(FEE_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pay-amount" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Amount (₹)
                </label>
                <input
                  id="pay-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  min={1}
                />
              </div>
              <div>
                <label htmlFor="pay-mode" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Payment Mode
                </label>
                <select
                  id="pay-mode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying || !amount}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ background: "oklch(0.48 0.15 155)" }}
                >
                  {paying && <Loader2 className="h-4 w-4 animate-spin" />}
                  {paying ? "Processing..." : "Pay Now"}
                </button>
              </div>
            </div>
          </div>

          {/* Last receipt */}
          {lastPayment && (
            <div className="print-receipt rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <h4 className="text-sm font-semibold text-emerald-800">Payment Receipt</h4>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="no-print flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Receipt No.</p>
                  <p className="font-semibold font-mono">{lastReceiptNo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold">{formatDate(lastPayment.paymentDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Student</p>
                  <p className="font-semibold">{selectedStudent.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Class – Section</p>
                  <p className="font-semibold">{selectedStudent.studentClass} – {selectedStudent.section}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount Paid</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(lastPayment.amountPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Mode</p>
                  <p className="font-semibold">{lastPayment.paymentMode}</p>
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-3 border-t border-emerald-200 pt-2">
                Global Pride International School · Academic Year 2026–2027
              </p>
            </div>
          )}

          {/* Payment History */}
          {selectedStudent.payments.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h4 className="text-sm font-semibold text-foreground">Payment History</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receipt No.</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mode</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...selectedStudent.payments].reverse().map((p) => (
                      <tr key={p.id.toString()} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{generateReceiptNo(p.id)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(p.amountPaid)}</td>
                        <td className="px-4 py-3">{p.paymentMode}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                            {p.feeCategory}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
