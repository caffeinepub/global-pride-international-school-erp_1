import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, X, Loader2 } from "lucide-react";
import { useBackend } from "../hooks/useBackend";
import { FeeCategory } from "../backend";
import type { Student, StudentExtras } from "../backend";
import {
  CLASSES,
  SECTIONS,
  DEFAULT_FEES,
  FEE_CATEGORY_LABELS,
  formatCurrency,
  getInstallmentAmount,
} from "../utils/constants";

const EMPTY_FORM = {
  name: "",
  studentClass: "Nursery",
  section: "A",
  fatherName: "",
  motherName: "",
  contactNumber: "",
  totalFee: DEFAULT_FEES["Nursery"],
  feePaymentCategory: FeeCategory.OTP,
  discountPercent: 0,
  examSA1: false,
  examSA2: false,
  dateOfBirth: "",
  aadharNo: "",
  admissionNo: "",
};

type FormState = typeof EMPTY_FORM;

export default function StudentsPage() {
  const { backend, isFetching: actorFetching } = useBackend();
  const [students, setStudents] = useState<Student[]>([]);
  const [extrasMap, setExtrasMap] = useState<Map<string, StudentExtras>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const loadStudents = useCallback(async () => {
    if (!backend) return;
    try {
      const [data, extras] = await Promise.all([
        backend.getAllStudents(),
        backend.getAllStudentExtras(),
      ]);
      setStudents(data);
      const map = new Map<string, StudentExtras>();
      for (const e of extras) {
        map.set(e.studentId.toString(), e);
      }
      setExtrasMap(map);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    if (!actorFetching) loadStudents();
  }, [loadStudents, actorFetching]);

  const discountAmount = useMemo(
    () => Math.round((form.totalFee * Math.min(100, Math.max(0, form.discountPercent))) / 100),
    [form.totalFee, form.discountPercent],
  );

  const examFeesSA1 = form.examSA1 ? 500 : 0;
  const examFeesSA2 = form.examSA2 ? 500 : 0;

  const finalFee = useMemo(
    () => Math.max(0, form.totalFee - discountAmount + examFeesSA1 + examFeesSA2),
    [form.totalFee, discountAmount, examFeesSA1, examFeesSA2],
  );

  const installmentAmount = getInstallmentAmount(finalFee, form.feePaymentCategory);

  const handleClassChange = (cls: string) => {
    setForm((prev) => ({
      ...prev,
      studentClass: cls,
      totalFee: DEFAULT_FEES[cls] ?? prev.totalFee,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backend) { toast.error("Backend not ready"); return; }
    setSaving(true);
    try {
      if (editingId !== null) {
        await backend.updateStudent(
          editingId,
          form.name,
          form.studentClass,
          form.section,
          form.fatherName,
          form.motherName,
          form.contactNumber,
          form.totalFee,
          form.feePaymentCategory,
          discountAmount,
          finalFee,
          examFeesSA1,
          examFeesSA2,
        );
        await backend.setStudentExtras(editingId, form.dateOfBirth, form.aadharNo, form.admissionNo);
        toast.success("Student updated successfully!");
      } else {
        const newId = await backend.addStudent(
          form.name,
          form.studentClass,
          form.section,
          form.fatherName,
          form.motherName,
          form.contactNumber,
          form.totalFee,
          form.feePaymentCategory,
          discountAmount,
          finalFee,
          examFeesSA1,
          examFeesSA2,
        );
        await backend.setStudentExtras(newId, form.dateOfBirth, form.aadharNo, form.admissionNo);
        toast.success("Student added successfully!");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      await loadStudents();
    } catch {
      toast.error("Failed to save student");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    const pct = student.totalFee > 0
      ? Math.round((student.discountAmount / student.totalFee) * 100)
      : 0;
    const extras = extrasMap.get(student.id.toString());
    setForm({
      name: student.name,
      studentClass: student.studentClass,
      section: student.section,
      fatherName: student.fatherName,
      motherName: student.motherName,
      contactNumber: student.contactNumber,
      totalFee: student.totalFee,
      feePaymentCategory: student.feePaymentCategory,
      discountPercent: pct,
      examSA1: student.examFeesSA1 > 0,
      examSA2: student.examFeesSA2 > 0,
      dateOfBirth: extras?.dateOfBirth ?? "",
      aadharNo: extras?.aadharNo ?? "",
      admissionNo: extras?.admissionNo ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: bigint) => {
    if (!backend) { toast.error("Backend not ready"); return; }
    if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      await backend.deleteStudent(id);
      toast.success("Student deleted");
      await loadStudents();
    } catch {
      toast.error("Failed to delete student");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchName = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = !filterClass || s.studentClass === filterClass;
      const matchSection = !filterSection || s.section === filterSection;
      return matchName && matchClass && matchSection;
    });
  }, [students, searchQuery, filterClass, filterSection]);

  const feeCategoryInstallmentLabel = (category: FeeCategory) => {
    switch (category) {
      case FeeCategory.OTP: return "Full";
      case FeeCategory.HalfYearly: return "Per installment (×2)";
      case FeeCategory.Term1:
      case FeeCategory.Term2:
      case FeeCategory.Term3: return "Per term (×3)";
      case FeeCategory.Monthly: return "Per month (×10)";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Students</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{students.length} total enrolled</p>
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

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div
            className="px-5 py-4 border-b border-border flex items-center justify-between"
            style={{ background: "oklch(0.96 0.025 155)" }}
          >
            <h3 className="font-semibold text-foreground">
              {editingId !== null ? "Edit Student" : "Add New Student"}
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Student Name */}
              <div className="md:col-span-2 lg:col-span-1">
                <label htmlFor="student-name" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Student Name *
                </label>
                <input
                  id="student-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Full name"
                  required
                />
              </div>

              {/* Class */}
              <div>
                <label htmlFor="student-class" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Class *
                </label>
                <select
                  id="student-class"
                  value={form.studentClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Section */}
              <div>
                <label htmlFor="student-section" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Section *
                </label>
                <select
                  id="student-section"
                  value={form.section}
                  onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Father Name */}
              <div>
                <label htmlFor="father-name" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Father Name *
                </label>
                <input
                  id="father-name"
                  type="text"
                  value={form.fatherName}
                  onChange={(e) => setForm((p) => ({ ...p, fatherName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Father's full name"
                  required
                />
              </div>

              {/* Mother Name */}
              <div>
                <label htmlFor="mother-name" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Mother Name
                </label>
                <input
                  id="mother-name"
                  type="text"
                  value={form.motherName}
                  onChange={(e) => setForm((p) => ({ ...p, motherName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Mother's full name"
                />
              </div>

              {/* Contact */}
              <div>
                <label htmlFor="contact-number" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Contact Number *
                </label>
                <input
                  id="contact-number"
                  type="tel"
                  value={form.contactNumber}
                  onChange={(e) => setForm((p) => ({ ...p, contactNumber: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="10-digit mobile"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="date-of-birth" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Date of Birth
                </label>
                <input
                  id="date-of-birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Aadhar Card No */}
              <div>
                <label htmlFor="aadhar-no" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Aadhar Card No
                </label>
                <input
                  id="aadhar-no"
                  type="text"
                  value={form.aadharNo}
                  onChange={(e) => setForm((p) => ({ ...p, aadharNo: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="12-digit Aadhar number"
                  maxLength={14}
                />
              </div>

              {/* Admission No */}
              <div>
                <label htmlFor="admission-no" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Admission No
                </label>
                <input
                  id="admission-no"
                  type="text"
                  value={form.admissionNo}
                  onChange={(e) => setForm((p) => ({ ...p, admissionNo: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Admission number"
                />
              </div>

              {/* Total Fee */}
              <div>
                <label htmlFor="total-fee" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Total Fee (₹)
                </label>
                <input
                  id="total-fee"
                  type="number"
                  value={form.totalFee}
                  onChange={(e) => setForm((p) => ({ ...p, totalFee: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  min={0}
                />
              </div>

              {/* Fee Category */}
              <div>
                <label htmlFor="fee-category" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Payment Category *
                </label>
                <select
                  id="fee-category"
                  value={form.feePaymentCategory}
                  onChange={(e) => setForm((p) => ({ ...p, feePaymentCategory: e.target.value as FeeCategory }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {Object.entries(FEE_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Discount */}
              <div>
                <label htmlFor="discount" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Discount (%)
                </label>
                <input
                  id="discount"
                  type="number"
                  value={form.discountPercent}
                  onChange={(e) => setForm((p) => ({ ...p, discountPercent: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  min={0}
                  max={100}
                  placeholder="0–100"
                />
              </div>
            </div>

            {/* Fee summary row */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg p-3 bg-secondary border border-border text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Final Fee</p>
                <p className="text-lg font-bold text-primary mt-0.5">{formatCurrency(finalFee)}</p>
                {discountAmount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">Discount: -{formatCurrency(discountAmount)}</p>
                )}
                {(examFeesSA1 > 0 || examFeesSA2 > 0) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exam: +{formatCurrency(examFeesSA1 + examFeesSA2)}
                  </p>
                )}
              </div>
              <div className="rounded-lg p-3 bg-secondary border border-border text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{feeCategoryInstallmentLabel(form.feePaymentCategory)}</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{formatCurrency(installmentAmount)}</p>
              </div>
              <div className="rounded-lg p-3 bg-secondary border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Exam Fees</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.examSA1}
                      onChange={(e) => setForm((p) => ({ ...p, examSA1: e.target.checked }))}
                      className="rounded"
                    />
                    <span>SA1 ₹500</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.examSA2}
                      onChange={(e) => setForm((p) => ({ ...p, examSA2: e.target.checked }))}
                      className="rounded"
                    />
                    <span>SA2 ₹500</span>
                  </label>
                </div>
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
                {editingId !== null ? "Update Student" : "Add Student"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="px-5 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Search students by name"
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Filter by class"
        >
          <option value="">All Classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Filter by section"
        >
          <option value="">All Sections</option>
          {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(searchQuery || filterClass || filterSection) && (
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setFilterClass(""); setFilterSection(""); }}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted/40"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Student Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found
            </span>
          </div>
          {filteredStudents.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">No students found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Class</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sec</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Father</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Adm. No</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Final Fee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student) => (
                    <tr key={student.id.toString()} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{student.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{student.studentClass}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {student.section}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{student.fatherName}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{student.contactNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {extrasMap.get(student.id.toString())?.admissionNo || <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(student.finalFee)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                          {student.feePaymentCategory}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(student)}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                            title="Edit student"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(student.id)}
                            disabled={deletingId === student.id}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                            title="Delete student"
                          >
                            {deletingId === student.id ? (
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
      )}
    </div>
  );
}
