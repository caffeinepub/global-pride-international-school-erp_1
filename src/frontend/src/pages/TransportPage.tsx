import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, CheckCircle, Search, Printer } from "lucide-react";
import { useBackend } from "../hooks/useBackend";
import { TransportOption } from "../backend";
import type { TransportStudent } from "../backend";
import { formatCurrency, MONTHS } from "../utils/constants";

const TRANSPORT_OPTIONS = [
  { value: TransportOption.PickUpDrop, label: "Pick Up & Drop" },
  { value: TransportOption.OnlyPickUp, label: "Only Pick Up" },
  { value: TransportOption.OnlyDrop, label: "Only Drop" },
];

const EMPTY_FORM = {
  name: "",
  fatherName: "",
  contactNumber: "",
  transportOption: TransportOption.PickUpDrop,
  monthlyFee: 1000,
};

type FormState = typeof EMPTY_FORM;

interface TransportReceipt {
  receiptNo: string;
  date: string;
  studentName: string;
  fatherName: string;
  contactNumber: string;
  transportOption: string;
  amount: number;
  month: number;
  year: number;
}

function generateTransportReceiptNo(studentId: bigint): string {
  const year = new Date().getFullYear();
  const paddedId = String(Number(studentId)).padStart(5, "0");
  return `TRANS-${year}-${paddedId}`;
}

export default function TransportPage() {
  const { backend, isFetching: actorFetching } = useBackend();
  const [students, setStudents] = useState<TransportStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  // Monthly fee status
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [unpaidStudents, setUnpaidStudents] = useState<TransportStudent[]>([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [unpaidShown, setUnpaidShown] = useState(false);
  const [markingId, setMarkingId] = useState<bigint | null>(null);

  // Transport billing state
  const [billingSearch, setBillingSearch] = useState("");
  const [billingDropdown, setBillingDropdown] = useState(false);
  const [billingStudent, setBillingStudent] = useState<TransportStudent | null>(null);
  const [billingMonth, setBillingMonth] = useState(currentDate.getMonth() + 1);
  const [billingYear, setBillingYear] = useState(currentDate.getFullYear());
  const [billingProcessing, setBillingProcessing] = useState(false);
  const [billingReceipt, setBillingReceipt] = useState<TransportReceipt | null>(null);

  // Student list name search
  const [listSearch, setListSearch] = useState("");

  const loadTransportStudents = useCallback(async () => {
    if (!backend) return;
    try {
      // Use getUnpaidTransportStudents with month=0, year=0 to get all students
      const data = await backend.getUnpaidTransportStudents(BigInt(0), BigInt(0));
      setStudents(data);
    } catch {
      toast.error("Failed to load transport students");
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    if (!actorFetching) loadTransportStudents();
  }, [loadTransportStudents, actorFetching]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backend) { toast.error("Backend not ready"); return; }
    setSaving(true);
    try {
      if (editingId !== null) {
        await backend.updateTransportStudent(
          editingId,
          form.name,
          form.fatherName,
          form.contactNumber,
          form.transportOption,
          form.monthlyFee,
        );
        toast.success("Transport student updated!");
      } else {
        await backend.addTransportStudent(
          form.name,
          form.fatherName,
          form.contactNumber,
          form.transportOption,
          form.monthlyFee,
        );
        toast.success("Transport student added!");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      await loadTransportStudents();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: TransportStudent) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      fatherName: s.fatherName,
      contactNumber: s.contactNumber,
      transportOption: s.transportOption,
      monthlyFee: s.monthlyFee,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: bigint) => {
    if (!backend) { toast.error("Backend not ready"); return; }
    if (!confirm("Delete this transport student?")) return;
    setDeletingId(id);
    try {
      await backend.deleteTransportStudent(id);
      toast.success("Deleted");
      await loadTransportStudents();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleShowUnpaid = async () => {
    if (!backend) { toast.error("Backend not ready"); return; }
    setLoadingUnpaid(true);
    setUnpaidShown(true);
    try {
      const data = await backend.getUnpaidTransportStudents(BigInt(selectedMonth), BigInt(selectedYear));
      setUnpaidStudents(data);
    } catch {
      toast.error("Failed to load unpaid students");
    } finally {
      setLoadingUnpaid(false);
    }
  };

  const handleMarkPaid = async (studentId: bigint) => {
    if (!backend) { toast.error("Backend not ready"); return; }
    setMarkingId(studentId);
    try {
      await backend.markTransportFeePaid(studentId, BigInt(selectedMonth), BigInt(selectedYear));
      toast.success("Marked as paid!");
      // Refresh unpaid list
      const data = await backend.getUnpaidTransportStudents(BigInt(selectedMonth), BigInt(selectedYear));
      setUnpaidStudents(data);
    } catch {
      toast.error("Failed to mark as paid");
    } finally {
      setMarkingId(null);
    }
  };

  // Billing handlers
  const billingFilteredStudents = students.filter((s) =>
    !billingSearch.trim() || s.name.toLowerCase().includes(billingSearch.toLowerCase()),
  ).slice(0, 8);

  const handleSelectBillingStudent = (s: TransportStudent) => {
    setBillingStudent(s);
    setBillingSearch(s.name);
    setBillingDropdown(false);
    setBillingReceipt(null);
  };

  const handleRecordTransportPayment = async () => {
    if (!backend) { toast.error("Backend not ready"); return; }
    if (!billingStudent) { toast.error("No student selected"); return; }
    setBillingProcessing(true);
    try {
      await backend.markTransportFeePaid(billingStudent.id, BigInt(billingMonth), BigInt(billingYear));
      const receiptNo = generateTransportReceiptNo(billingStudent.id);
      const transportLabel = TRANSPORT_OPTIONS.find((o) => o.value === billingStudent.transportOption)?.label ?? billingStudent.transportOption;
      setBillingReceipt({
        receiptNo,
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
        studentName: billingStudent.name,
        fatherName: billingStudent.fatherName,
        contactNumber: billingStudent.contactNumber,
        transportOption: transportLabel,
        amount: billingStudent.monthlyFee,
        month: billingMonth,
        year: billingYear,
      });
      toast.success(`Transport fee recorded! Receipt: ${receiptNo}`);
      // Refresh students list
      await loadTransportStudents();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setBillingProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transport</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Manage student transport and monthly fees</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: "oklch(0.48 0.15 155)" }}
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div
            className="px-5 py-4 border-b border-border flex items-center justify-between"
            style={{ background: "oklch(0.96 0.025 155)" }}
          >
            <h3 className="font-semibold text-foreground text-sm">
              {editingId !== null ? "Edit Transport Student" : "Add Transport Student"}
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="t-name" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Student Name *
                </label>
                <input
                  id="t-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="t-father" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Father Name *
                </label>
                <input
                  id="t-father"
                  type="text"
                  value={form.fatherName}
                  onChange={(e) => setForm((p) => ({ ...p, fatherName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="t-contact" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Contact Number *
                </label>
                <input
                  id="t-contact"
                  type="tel"
                  value={form.contactNumber}
                  onChange={(e) => setForm((p) => ({ ...p, contactNumber: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="t-option" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Transport Option *
                </label>
                <select
                  id="t-option"
                  value={form.transportOption}
                  onChange={(e) => setForm((p) => ({ ...p, transportOption: e.target.value as TransportOption }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TRANSPORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="t-fee" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Monthly Fee (₹)
                </label>
                <input
                  id="t-fee"
                  type="number"
                  value={form.monthlyFee}
                  onChange={(e) => setForm((p) => ({ ...p, monthlyFee: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  min={0}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: "oklch(0.48 0.15 155)" }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId !== null ? "Update" : "Add Student"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="px-5 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-muted/40"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transport Student List */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Transport Students ({students.length})</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search by name..."
              className="pl-9 pr-4 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary w-56"
              aria-label="Search transport students"
            />
          </div>
        </div>
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">No transport students added yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/10 border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Father</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Option</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monthly Fee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.filter((s) => !listSearch.trim() || s.name.toLowerCase().includes(listSearch.toLowerCase())).map((s) => (
                  <tr key={s.id.toString()} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.fatherName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.contactNumber}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                        {TRANSPORT_OPTIONS.find((o) => o.value === s.transportOption)?.label ?? s.transportOption}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(s.monthlyFee)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(s)}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                          title="Delete"
                        >
                          {deletingId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Fee Status */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Fee Status</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label htmlFor="t-month" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Month</label>
              <select
                id="t-month"
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(Number(e.target.value)); setUnpaidShown(false); }}
                className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="t-year" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Year</label>
              <select
                id="t-year"
                value={selectedYear}
                onChange={(e) => { setSelectedYear(Number(e.target.value)); setUnpaidShown(false); }}
                className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleShowUnpaid}
              disabled={loadingUnpaid}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: "oklch(0.48 0.15 155)" }}
            >
              {loadingUnpaid && <Loader2 className="h-4 w-4 animate-spin" />}
              Show Unpaid
            </button>
          </div>
        </div>

        {unpaidShown && !loadingUnpaid && (
          <div>
            {unpaidStudents.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-emerald-700 font-semibold text-sm">All paid for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-50 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-wide">Contact</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-wide">Monthly Fee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unpaidStudents.map((s) => (
                      <tr key={s.id.toString()} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.contactNumber}</td>
                        <td className="px-4 py-3 font-semibold text-amber-700">{formatCurrency(s.monthlyFee)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(s.id)}
                            disabled={markingId === s.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                          >
                            {markingId === s.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Mark Paid
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transport Billing */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div
          className="px-5 py-4 border-b border-border"
          style={{ background: "oklch(0.96 0.025 155)" }}
        >
          <h3 className="text-sm font-semibold text-foreground">Transport Billing</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Record transport fee payment and generate receipt</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Student Search */}
          <div>
            <label htmlFor="billing-student-search" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Select Transport Student
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                id="billing-student-search"
                type="text"
                value={billingSearch}
                onChange={(e) => { setBillingSearch(e.target.value); setBillingDropdown(true); setBillingStudent(null); setBillingReceipt(null); }}
                onFocus={() => setBillingDropdown(true)}
                placeholder="Search transport student by name..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {billingDropdown && billingSearch && billingFilteredStudents.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {billingFilteredStudents.map((s) => (
                    <button
                      key={s.id.toString()}
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
                      onClick={() => handleSelectBillingStudent(s)}
                    >
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(s.monthlyFee)}/mo</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Student Info */}
          {billingStudent && (
            <>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Student</p>
                    <p className="font-semibold text-foreground">{billingStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Father</p>
                    <p className="font-medium text-foreground">{billingStudent.fatherName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="font-medium text-foreground">{billingStudent.contactNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Fee</p>
                    <p className="font-bold text-primary">{formatCurrency(billingStudent.monthlyFee)}</p>
                  </div>
                </div>
              </div>

              {/* Month/Year + Record Button */}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label htmlFor="billing-month" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Month</label>
                  <select
                    id="billing-month"
                    value={billingMonth}
                    onChange={(e) => { setBillingMonth(Number(e.target.value)); setBillingReceipt(null); }}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="billing-year" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Year</label>
                  <select
                    id="billing-year"
                    value={billingYear}
                    onChange={(e) => { setBillingYear(Number(e.target.value)); setBillingReceipt(null); }}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleRecordTransportPayment}
                  disabled={billingProcessing}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ background: "oklch(0.48 0.15 155)" }}
                >
                  {billingProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {billingProcessing ? "Processing..." : "Record Payment"}
                </button>
              </div>
            </>
          )}

          {/* Transport Receipt */}
          {billingReceipt && (
            <div className="print-receipt rounded-xl border border-emerald-200 bg-emerald-50 p-5 mt-2">
              {/* Bill No. — prominent header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-emerald-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <h4 className="text-sm font-semibold text-emerald-800">Transport Fee Receipt</h4>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-emerald-700 uppercase font-semibold tracking-wide">Bill No.</span>
                    <span className="text-xl font-extrabold font-mono text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg tracking-wider">
                      {billingReceipt.receiptNo}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold">{billingReceipt.date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Month / Year</p>
                  <p className="font-semibold">{MONTHS[billingReceipt.month - 1]} {billingReceipt.year}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Student Name</p>
                  <p className="font-semibold">{billingReceipt.studentName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Father Name</p>
                  <p className="font-semibold">{billingReceipt.fatherName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-semibold">{billingReceipt.contactNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transport Option</p>
                  <p className="font-semibold">{billingReceipt.transportOption}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount Paid</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(billingReceipt.amount)}</p>
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-3 border-t border-emerald-200 pt-2">
                Global Pride International School · Transport Fee Receipt
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
