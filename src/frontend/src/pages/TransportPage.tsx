import {
  CheckCircle,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CLASSES, MONTHS, formatCurrency } from "../utils/constants";
import {
  type TransportOption,
  TransportOptionEnum,
  type TransportStudent,
  addTransportStudent,
  deleteTransportStudent,
  getAllTransportStudents,
  getUnpaidTransportStudents,
  markTransportFeePaid,
  updateTransportStudent,
} from "../utils/localStore";

const TRANSPORT_OPTIONS = [
  { value: TransportOptionEnum.PickUpDrop, label: "Pick Up & Drop" },
  { value: TransportOptionEnum.OnlyPickUp, label: "Only Pick Up" },
  { value: TransportOptionEnum.OnlyDrop, label: "Only Drop" },
];

const EMPTY_FORM = {
  name: "",
  fatherName: "",
  contactNumber: "",
  transportOption: TransportOptionEnum.PickUpDrop,
  monthlyFee: 1000,
  studentClass: CLASSES[0],
};

type FormState = typeof EMPTY_FORM;

interface TransportReceipt {
  billNo: string;
  date: string;
  studentName: string;
  fatherName: string;
  contactNumber: string;
  transportOption: string;
  amount: number;
  month: number;
  year: number;
  studentClass: string;
}

export interface TransportPaymentLocalRecord {
  billNo: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  month: number;
  year: number;
  paymentDate: string; // ISO string
  amount: number;
  transportOption: string;
}

// ─── localStorage helpers for billing (kept for backward compat with FeeReport) ──

function getNextTransportBillNo(): string {
  const counter = Number.parseInt(
    localStorage.getItem("transport_bill_counter") || "1",
    10,
  );
  const year = new Date().getFullYear();
  const billNo = `TBILL-${year}-${String(counter).padStart(5, "0")}`;
  localStorage.setItem("transport_bill_counter", String(counter + 1));
  return billNo;
}

function saveTransportPaymentRecord(record: TransportPaymentLocalRecord): void {
  const existing: TransportPaymentLocalRecord[] = JSON.parse(
    localStorage.getItem("transport_payments") || "[]",
  );
  existing.push(record);
  localStorage.setItem("transport_payments", JSON.stringify(existing));
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TransportPage() {
  const [students, setStudents] = useState<TransportStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Monthly fee status
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [unpaidStudents, setUnpaidStudents] = useState<TransportStudent[]>([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [unpaidShown, setUnpaidShown] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  // Transport billing state
  const [billingSearch, setBillingSearch] = useState("");
  const [billingDropdown, setBillingDropdown] = useState(false);
  const [billingStudent, setBillingStudent] = useState<TransportStudent | null>(
    null,
  );
  const [billingStudentClass, setBillingStudentClass] = useState(CLASSES[0]);
  const [billingMonth, setBillingMonth] = useState(currentDate.getMonth() + 1);
  const [billingYear, setBillingYear] = useState(currentDate.getFullYear());
  const [billingProcessing, setBillingProcessing] = useState(false);
  const [billingReceipt, setBillingReceipt] = useState<TransportReceipt | null>(
    null,
  );

  // Student list name search
  const [listSearch, setListSearch] = useState("");

  const loadTransportStudents = () => {
    try {
      const data = getAllTransportStudents();
      setStudents(data);
    } catch {
      toast.error("Failed to load transport students");
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadTransportStudents is stable
  useEffect(() => {
    loadTransportStudents();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId !== null) {
        updateTransportStudent(editingId, {
          name: form.name,
          fatherName: form.fatherName,
          contactNumber: form.contactNumber,
          transportOption: form.transportOption,
          monthlyFee: form.monthlyFee,
        });
        // Save class in student data via update
        toast.success("Transport student updated!");
      } else {
        addTransportStudent({
          name: form.name,
          fatherName: form.fatherName,
          contactNumber: form.contactNumber,
          transportOption: form.transportOption,
          monthlyFee: form.monthlyFee,
        });
        toast.success("Transport student added!");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      loadTransportStudents();
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
      studentClass: CLASSES[0],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this transport student?")) return;
    setDeletingId(id);
    try {
      deleteTransportStudent(id);
      toast.success("Deleted");
      loadTransportStudents();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleShowUnpaid = () => {
    setLoadingUnpaid(true);
    setUnpaidShown(true);
    try {
      const data = getUnpaidTransportStudents(selectedMonth, selectedYear);
      setUnpaidStudents(data);
    } catch {
      toast.error("Failed to load unpaid students");
    } finally {
      setLoadingUnpaid(false);
    }
  };

  const handleMarkPaid = (studentId: number) => {
    setMarkingId(studentId);
    try {
      markTransportFeePaid(studentId, selectedMonth, selectedYear);
      toast.success("Marked as paid!");
      // Refresh unpaid list
      const data = getUnpaidTransportStudents(selectedMonth, selectedYear);
      setUnpaidStudents(data);
    } catch {
      toast.error("Failed to mark as paid");
    } finally {
      setMarkingId(null);
    }
  };

  // Billing handlers
  const billingFilteredStudents = students
    .filter(
      (s) =>
        !billingSearch.trim() ||
        s.name.toLowerCase().includes(billingSearch.toLowerCase()),
    )
    .slice(0, 8);

  const handleSelectBillingStudent = (s: TransportStudent) => {
    setBillingStudent(s);
    setBillingSearch(s.name);
    setBillingDropdown(false);
    setBillingReceipt(null);
    setBillingStudentClass(CLASSES[0]);
  };

  const handleRecordTransportPayment = () => {
    if (!billingStudent) {
      toast.error("No student selected");
      return;
    }
    setBillingProcessing(true);
    try {
      markTransportFeePaid(billingStudent.id, billingMonth, billingYear);
      const billNo = getNextTransportBillNo();
      const transportLabel =
        TRANSPORT_OPTIONS.find(
          (o) => o.value === billingStudent.transportOption,
        )?.label ?? String(billingStudent.transportOption);
      // Use local date string to ensure the payment date matches the device calendar date
      const now = new Date();
      const paymentDateISO = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).toISOString();

      // Save payment record to localStorage (for FeeReport backward compat)
      saveTransportPaymentRecord({
        billNo,
        studentId: billingStudent.id.toString(),
        studentName: billingStudent.name,
        studentClass: billingStudentClass,
        month: billingMonth,
        year: billingYear,
        paymentDate: paymentDateISO,
        amount: billingStudent.monthlyFee,
        transportOption: transportLabel,
      });

      setBillingReceipt({
        billNo,
        date: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        studentName: billingStudent.name,
        fatherName: billingStudent.fatherName,
        contactNumber: billingStudent.contactNumber,
        transportOption: transportLabel,
        amount: billingStudent.monthlyFee,
        month: billingMonth,
        year: billingYear,
        studentClass: billingStudentClass,
      });
      toast.success(`Transport fee recorded! Bill No: ${billNo}`);
      // Refresh students list
      loadTransportStudents();
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
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage student transport and monthly fees
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(EMPTY_FORM);
              setShowForm(true);
            }}
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
              {editingId !== null
                ? "Edit Transport Student"
                : "Add Transport Student"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="t-name"
                  className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                >
                  Student Name *
                </label>
                <input
                  id="t-name"
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="t-father"
                  className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                >
                  Father Name *
                </label>
                <input
                  id="t-father"
                  type="text"
                  value={form.fatherName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, fatherName: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="t-contact"
                  className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                >
                  Contact Number *
                </label>
                <input
                  id="t-contact"
                  type="tel"
                  value={form.contactNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contactNumber: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="t-class"
                  className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                >
                  Class *
                </label>
                <select
                  id="t-class"
                  value={form.studentClass}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, studentClass: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="t-option"
                  className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                >
                  Transport Option *
                </label>
                <select
                  id="t-option"
                  value={form.transportOption}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      transportOption: e.target.value as TransportOption,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TRANSPORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="t-fee"
                  className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                >
                  Monthly Fee (₹)
                </label>
                <input
                  id="t-fee"
                  type="number"
                  value={form.monthlyFee}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      monthlyFee: Number(e.target.value),
                    }))
                  }
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
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
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
          <h3 className="text-sm font-semibold text-foreground">
            Transport Students ({students.length})
          </h3>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
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
            <p className="text-muted-foreground text-sm">
              No transport students added yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/10 border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    Father
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Option
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Monthly Fee
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students
                  .filter(
                    (s) =>
                      !listSearch.trim() ||
                      s.name.toLowerCase().includes(listSearch.toLowerCase()),
                  )
                  .map((s) => (
                    <tr
                      key={s.id.toString()}
                      className="hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {s.fatherName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.contactNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                          {TRANSPORT_OPTIONS.find(
                            (o) => o.value === s.transportOption,
                          )?.label ?? String(s.transportOption)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatCurrency(s.monthlyFee)}
                      </td>
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
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Monthly Fee Status
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label
                htmlFor="t-month"
                className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
              >
                Month
              </label>
              <select
                id="t-month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setUnpaidShown(false);
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
                htmlFor="t-year"
                className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
              >
                Year
              </label>
              <select
                id="t-year"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setUnpaidShown(false);
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
                <p className="text-emerald-700 font-semibold text-sm">
                  All paid for {MONTHS[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-50 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                        Contact
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                        Monthly Fee
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unpaidStudents.map((s) => (
                      <tr
                        key={s.id.toString()}
                        className="hover:bg-amber-50/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {s.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.contactNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-700">
                          {formatCurrency(s.monthlyFee)}
                        </td>
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
          <h3 className="text-sm font-semibold text-foreground">
            Transport Billing
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record transport fee payment and generate receipt with sequential
            Bill No.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Student Search */}
          <div>
            <label
              htmlFor="billing-student-search"
              className="block text-sm font-semibold mb-2 uppercase tracking-wide"
              style={{ color: "oklch(0.38 0.12 155)" }}
            >
              Select Transport Student *
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5"
                style={{ color: "oklch(0.48 0.15 155)" }}
                aria-hidden="true"
              />
              <input
                id="billing-student-search"
                type="text"
                value={billingSearch}
                onChange={(e) => {
                  setBillingSearch(e.target.value);
                  setBillingDropdown(true);
                  setBillingStudent(null);
                  setBillingReceipt(null);
                }}
                onFocus={() => setBillingDropdown(true)}
                placeholder="Type student name to search and select..."
                className="w-full pl-10 pr-4 py-3 text-sm rounded-lg bg-background focus:outline-none transition-colors"
                style={{
                  border: billingStudent
                    ? "2px solid oklch(0.48 0.15 155)"
                    : "2px solid oklch(0.65 0.12 155)",
                  boxShadow: billingStudent
                    ? "0 0 0 3px oklch(0.48 0.15 155 / 0.15)"
                    : undefined,
                }}
              />
              {!billingStudent && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: "oklch(0.92 0.06 155)",
                    color: "oklch(0.38 0.12 155)",
                  }}
                >
                  Required
                </span>
              )}
              {billingDropdown &&
                billingSearch &&
                billingFilteredStudents.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 z-20 mt-1 bg-card rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                    style={{ border: "2px solid oklch(0.48 0.15 155)" }}
                  >
                    {billingFilteredStudents.map((s) => (
                      <button
                        key={s.id.toString()}
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left"
                        style={{
                          borderBottom: "1px solid oklch(0.92 0.04 155)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "oklch(0.94 0.06 155)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "";
                        }}
                        onClick={() => handleSelectBillingStudent(s)}
                      >
                        <span className="font-semibold text-foreground">
                          {s.name}
                        </span>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: "oklch(0.92 0.06 155)",
                            color: "oklch(0.38 0.12 155)",
                          }}
                        >
                          {formatCurrency(s.monthlyFee)}/mo
                        </span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
            {!billingStudent && (
              <p
                className="text-xs mt-1.5 font-medium"
                style={{ color: "oklch(0.48 0.15 155)" }}
              >
                Search and click a student name from the dropdown to select them
              </p>
            )}
          </div>

          {/* Selected Student Info */}
          {billingStudent && (
            <>
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "2px solid oklch(0.48 0.15 155)" }}
              >
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: "oklch(0.48 0.15 155)" }}
                >
                  <CheckCircle className="h-4 w-4 text-white" />
                  <span className="text-white text-xs font-bold uppercase tracking-wide">
                    Student Selected
                  </span>
                  <span className="ml-auto text-white font-bold text-sm">
                    {billingStudent.name}
                  </span>
                </div>
                <div
                  className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
                  style={{ background: "oklch(0.96 0.04 155)" }}
                >
                  <div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "oklch(0.45 0.10 155)" }}
                    >
                      Father
                    </p>
                    <p className="font-medium text-foreground">
                      {billingStudent.fatherName}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "oklch(0.45 0.10 155)" }}
                    >
                      Contact
                    </p>
                    <p className="font-medium text-foreground">
                      {billingStudent.contactNumber}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "oklch(0.45 0.10 155)" }}
                    >
                      Transport Option
                    </p>
                    <p className="font-medium text-foreground">
                      {TRANSPORT_OPTIONS.find(
                        (o) => o.value === billingStudent.transportOption,
                      )?.label ?? String(billingStudent.transportOption)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "oklch(0.45 0.10 155)" }}
                    >
                      Monthly Fee
                    </p>
                    <p
                      className="font-bold text-lg"
                      style={{ color: "oklch(0.38 0.15 155)" }}
                    >
                      {formatCurrency(billingStudent.monthlyFee)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Class + Month/Year + Record Button */}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label
                    htmlFor="billing-class"
                    className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                  >
                    Class
                  </label>
                  <select
                    id="billing-class"
                    value={billingStudentClass}
                    onChange={(e) => {
                      setBillingStudentClass(e.target.value);
                      setBillingReceipt(null);
                    }}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="billing-month"
                    className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                  >
                    Month
                  </label>
                  <select
                    id="billing-month"
                    value={billingMonth}
                    onChange={(e) => {
                      setBillingMonth(Number(e.target.value));
                      setBillingReceipt(null);
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
                    htmlFor="billing-year"
                    className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
                  >
                    Year
                  </label>
                  <select
                    id="billing-year"
                    value={billingYear}
                    onChange={(e) => {
                      setBillingYear(Number(e.target.value));
                      setBillingReceipt(null);
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
                  onClick={handleRecordTransportPayment}
                  disabled={billingProcessing}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ background: "oklch(0.48 0.15 155)" }}
                >
                  {billingProcessing && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
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
                    <h4 className="text-sm font-semibold text-emerald-800">
                      Transport Fee Receipt
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-emerald-700 uppercase font-semibold tracking-wide">
                      Bill No.
                    </span>
                    <span className="text-xl font-extrabold font-mono text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg tracking-wider">
                      {billingReceipt.billNo}
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
                  <p className="font-semibold">
                    {MONTHS[billingReceipt.month - 1]} {billingReceipt.year}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Class</p>
                  <p className="font-semibold">{billingReceipt.studentClass}</p>
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
                  <p className="font-semibold">
                    {billingReceipt.contactNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Transport Option
                  </p>
                  <p className="font-semibold">
                    {billingReceipt.transportOption}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount Paid</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {formatCurrency(billingReceipt.amount)}
                  </p>
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
