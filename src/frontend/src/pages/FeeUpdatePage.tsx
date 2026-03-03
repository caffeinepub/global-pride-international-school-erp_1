import { AlertCircle, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CLASSES,
  FEE_CATEGORY_LABELS,
  SECTIONS,
  formatCurrency,
  getInstallmentAmount,
} from "../utils/constants";
import {
  type FeeCategory,
  FeeCategoryEnum,
  type Student,
  getAllStudents,
} from "../utils/localStore";

export default function FeeUpdatePage() {
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [selectedSection, setSelectedSection] = useState(SECTIONS[0]);
  const [selectedCategory, setSelectedCategory] = useState<FeeCategory>(
    FeeCategoryEnum.OTP,
  );
  const [loading, setLoading] = useState(false);
  const [unpaidStudents, setUnpaidStudents] = useState<Student[]>([]);
  const [searched, setSearched] = useState(false);
  const [nameSearch, setNameSearch] = useState("");

  const handleShowUnpaid = () => {
    setLoading(true);
    setSearched(true);
    try {
      const allStudents: Student[] = getAllStudents();
      const classStudents = allStudents.filter(
        (s) =>
          s.studentClass === selectedClass && s.section === selectedSection,
      );
      const unpaid = classStudents.filter((s) => {
        const hasPaid = s.payments.some(
          (p) => p.feeCategory === selectedCategory,
        );
        return !hasPaid;
      });
      setUnpaidStudents(unpaid);
      if (unpaid.length === 0) {
        toast.success("All students have paid for this category!");
      } else {
        toast.error(`${unpaid.length} student(s) have not paid`);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredUnpaid = useMemo(() => {
    if (!nameSearch.trim()) return unpaidStudents;
    return unpaidStudents.filter((s) =>
      s.name.toLowerCase().includes(nameSearch.toLowerCase()),
    );
  }, [unpaidStudents, nameSearch]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Fee Update</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          View unpaid fee status by class and category
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label
              htmlFor="fu-class"
              className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
            >
              Class
            </label>
            <select
              id="fu-class"
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSearched(false);
              }}
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
              htmlFor="fu-section"
              className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
            >
              Section
            </label>
            <select
              id="fu-section"
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSearched(false);
              }}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="fu-category"
              className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
            >
              Fee Category
            </label>
            <select
              id="fu-category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as FeeCategory);
                setSearched(false);
              }}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.entries(FEE_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              type="button"
              onClick={handleShowUnpaid}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: "oklch(0.48 0.15 155)" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Show Unpaid
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && !loading && (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground text-sm">
                Unpaid Students — {selectedClass} / Section {selectedSection} /{" "}
                {FEE_CATEGORY_LABELS[selectedCategory]}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unpaidStudents.length} student(s) have not paid
              </p>
            </div>
            {unpaidStudents.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">
                  {unpaidStudents.length} Unpaid
                </span>
              </div>
            )}
          </div>

          {unpaidStudents.length > 0 && (
            <div className="px-5 py-3 border-b border-border">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  placeholder="Search student by name..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Search unpaid students by name"
                />
              </div>
            </div>
          )}

          {unpaidStudents.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✓</span>
              </div>
              <p className="font-semibold text-emerald-700">All paid!</p>
              <p className="text-muted-foreground text-sm mt-1">
                All students in {selectedClass} / Section {selectedSection} have
                paid {FEE_CATEGORY_LABELS[selectedCategory]}
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
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Class
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Section
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Contact
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Fee Due
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUnpaid.map((student, idx) => (
                    <tr
                      key={student.id.toString()}
                      className="hover:bg-amber-50/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {student.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.studentClass}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {student.section}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.contactNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-amber-700">
                          {formatCurrency(
                            getInstallmentAmount(
                              student.finalFee,
                              selectedCategory,
                            ),
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/10">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right"
                    >
                      Total Outstanding{nameSearch.trim() ? " (filtered)" : ""}
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-700 text-base">
                      {formatCurrency(
                        filteredUnpaid.reduce(
                          (sum, s) =>
                            sum +
                            getInstallmentAmount(s.finalFee, selectedCategory),
                          0,
                        ),
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="rounded-xl border border-border bg-card shadow-xs py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Select class, section, and fee category, then click{" "}
            <strong>Show Unpaid</strong>
          </p>
        </div>
      )}
    </div>
  );
}
