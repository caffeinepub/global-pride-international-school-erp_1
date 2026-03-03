import { AlertCircle, DollarSign, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { CLASSES, formatCurrency } from "../utils/constants";
import { type Student, getAllStudents } from "../utils/localStore";

interface ClassBreakdown {
  className: string;
  sections: string[];
  count: number;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const data = getAllStudents();
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const totalFeeCollected = students.reduce(
    (sum, s) => sum + s.payments.reduce((ps, p) => ps + p.amountPaid, 0),
    0,
  );

  const pendingFees = students.reduce((sum, s) => {
    const paid = s.payments.reduce((ps, p) => ps + p.amountPaid, 0);
    return sum + Math.max(0, s.finalFee - paid);
  }, 0);

  const classBreakdown: ClassBreakdown[] = CLASSES.map((cls) => {
    const inClass = students.filter((s) => s.studentClass === cls);
    const sections = [...new Set(inClass.map((s) => s.section))].sort();
    return { className: cls, sections, count: inClass.length };
  });

  const summaryCards = [
    {
      label: "Total Students",
      value: students.length.toString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      label: "Fee Collected",
      value: formatCurrency(totalFeeCollected),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      label: "Pending Fees",
      value: formatCurrency(pendingFees),
      icon: AlertCircle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      label: "Active Classes",
      value: classBreakdown.filter((c) => c.count > 0).length.toString(),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      borderColor: "border-purple-200",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Academic Year 2026–2027 · Overview
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl border ${card.borderColor} ${card.bg} p-5 shadow-xs`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className={`text-2xl font-bold mt-1.5 ${card.color}`}>
                    {card.value}
                  </p>
                </div>
                <div
                  className={`p-2.5 rounded-lg ${card.bg} border ${card.borderColor}`}
                >
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Class breakdown table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">
            Class-wise Student Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Class
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Sections Active
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Student Count
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classBreakdown.map((row) => (
                <tr
                  key={row.className}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-foreground">
                    {row.className}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {row.sections.length > 0 ? row.sections.join(", ") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full text-xs font-bold ${
                        row.count > 0
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.count}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        row.count > 0
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          row.count > 0
                            ? "bg-emerald-500"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                      {row.count > 0 ? "Active" : "No students"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Total: {classBreakdown.reduce((s, c) => s + c.count, 0)} students
            across {classBreakdown.filter((c) => c.count > 0).length} classes
          </span>
          <span className="font-medium text-foreground">AY 2026–27</span>
        </div>
      </div>
    </div>
  );
}
