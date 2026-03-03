import { BookOpen, Loader2, Plus, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CLASSES, SECTIONS } from "../utils/constants";
import {
  type ReportCard,
  type Student,
  getAllStudents,
  getReportCard,
  saveOrUpdateReportCard,
} from "../utils/localStore";

export default function ReportCardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [loadingRC, setLoadingRC] = useState(false);
  const [saving, setSaving] = useState(false);

  // Student filter state
  const [rcNameSearch, setRcNameSearch] = useState("");
  const [rcFilterClass, setRcFilterClass] = useState("");
  const [rcFilterSection, setRcFilterSection] = useState("");

  // Editable state
  const [subjects, setSubjects] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [marks, setMarks] = useState<number[][]>([]);

  const filteredStudents = useMemo(() => {
    let result = students;
    if (rcFilterClass)
      result = result.filter((s) => s.studentClass === rcFilterClass);
    if (rcFilterSection)
      result = result.filter((s) => s.section === rcFilterSection);
    if (rcNameSearch.trim())
      result = result.filter((s) =>
        s.name.toLowerCase().includes(rcNameSearch.toLowerCase()),
      );
    return result;
  }, [students, rcNameSearch, rcFilterClass, rcFilterSection]);

  useEffect(() => {
    try {
      const data = getAllStudents();
      setStudents(data);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const handleSelectStudent = (id: number) => {
    setSelectedStudentId(id);
    const student = students.find((s) => s.id === id) ?? null;
    setSelectedStudent(student);
    setLoadingRC(true);
    setReportCard(null);
    setSubjects([]);
    setColumns([]);
    setMarks([]);
    try {
      const rc = getReportCard(id);
      if (rc) {
        setReportCard(rc);
        setSubjects(rc.subjects);
        setColumns(rc.columns);
        setMarks(rc.marksEntries);
      } else {
        // Default template
        const defaultSubjects = [
          "English",
          "Mathematics",
          "Science",
          "Social Science",
          "Hindi",
        ];
        const defaultColumns = ["FA1", "FA2", "SA1", "SA2", "Total"];
        const defaultMarks = defaultSubjects.map(() =>
          defaultColumns.map(() => 0),
        );
        setSubjects(defaultSubjects);
        setColumns(defaultColumns);
        setMarks(defaultMarks);
      }
    } catch {
      toast.error("Failed to load report card");
    } finally {
      setLoadingRC(false);
    }
  };

  const addSubject = () => {
    setSubjects((prev) => [...prev, `Subject ${prev.length + 1}`]);
    setMarks((prev) => [...prev, columns.map(() => 0)]);
  };

  const removeSubject = (idx: number) => {
    setSubjects((prev) => prev.filter((_, i) => i !== idx));
    setMarks((prev) => prev.filter((_, i) => i !== idx));
  };

  const addColumn = () => {
    setColumns((prev) => [...prev, `Col ${prev.length + 1}`]);
    setMarks((prev) => prev.map((row) => [...row, 0]));
  };

  const removeColumn = (colIdx: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== colIdx));
    setMarks((prev) => prev.map((row) => row.filter((_, i) => i !== colIdx)));
  };

  const updateSubjectName = (idx: number, value: string) => {
    setSubjects((prev) => prev.map((s, i) => (i === idx ? value : s)));
  };

  const updateColumnName = (idx: number, value: string) => {
    setColumns((prev) => prev.map((c, i) => (i === idx ? value : c)));
  };

  const updateMark = (rowIdx: number, colIdx: number, value: string) => {
    const num = Number.parseFloat(value) || 0;
    setMarks((prev) =>
      prev.map((row, ri) =>
        ri === rowIdx
          ? row.map((cell, ci) => (ci === colIdx ? num : cell))
          : row,
      ),
    );
  };

  const handleSave = () => {
    if (!selectedStudentId) {
      toast.error("No student selected");
      return;
    }
    if (subjects.length === 0) {
      toast.error("Add at least one subject");
      return;
    }
    if (columns.length === 0) {
      toast.error("Add at least one column");
      return;
    }
    setSaving(true);
    try {
      saveOrUpdateReportCard(selectedStudentId, subjects, columns, marks);
      toast.success("Report card saved!");
      const rc = getReportCard(selectedStudentId);
      if (rc) setReportCard(rc);
    } catch {
      toast.error("Failed to save report card");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h2 className="text-2xl font-bold text-foreground">Report Card</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Create and manage student report cards
        </p>
      </div>

      {/* Student selector */}
      <div className="no-print rounded-xl border border-border bg-card shadow-xs p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Select Student
        </h3>
        {/* Filter row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={rcNameSearch}
              onChange={(e) => setRcNameSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Search student by name"
            />
          </div>
          <div>
            <select
              value={rcFilterClass}
              onChange={(e) => setRcFilterClass(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by class"
            >
              <option value="">All Classes</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={rcFilterSection}
              onChange={(e) => setRcFilterSection(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by section"
            >
              <option value="">All Sections</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label
          htmlFor="rc-student"
          className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide"
        >
          Select Student{" "}
          {filteredStudents.length !== students.length &&
            `(${filteredStudents.length} shown)`}
        </label>
        <select
          id="rc-student"
          value={selectedStudentId?.toString() ?? ""}
          onChange={(e) => {
            if (e.target.value) handleSelectStudent(Number(e.target.value));
          }}
          className="w-full max-w-sm px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={loadingStudents}
        >
          <option value="">-- Select a student --</option>
          {filteredStudents.map((s) => (
            <option key={s.id.toString()} value={s.id.toString()}>
              {s.name} — {s.studentClass} / {s.section}
            </option>
          ))}
        </select>
        {loadingStudents && (
          <p className="text-xs text-muted-foreground mt-1">
            Loading students...
          </p>
        )}
      </div>

      {loadingRC && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {selectedStudent &&
        !loadingRC &&
        subjects.length >= 0 &&
        columns.length >= 0 && (
          <>
            {/* Print area header */}
            <div className="print-report-card">
              {/* Print-only header */}
              <div className="hidden print:block text-center border-b-2 border-gray-800 pb-4 mb-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-14 h-14 rounded-full bg-green-800 flex items-center justify-center">
                    <span className="text-white font-extrabold text-sm">
                      GPIS
                    </span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">
                      Global Pride International School
                    </h1>
                    <p className="text-sm text-gray-600">
                      Academic Year 2026–2027
                    </p>
                  </div>
                </div>
                <h2 className="text-lg font-bold mt-2">STUDENT REPORT CARD</h2>
                <div className="grid grid-cols-3 gap-4 mt-3 text-sm text-left border border-gray-300 p-3 rounded">
                  <div>
                    <span className="text-gray-500">Name:</span>{" "}
                    <strong>{selectedStudent.name}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Class:</span>{" "}
                    <strong>
                      {selectedStudent.studentClass} – {selectedStudent.section}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Father:</span>{" "}
                    <strong>{selectedStudent.fatherName}</strong>
                  </div>
                </div>
              </div>

              {/* Screen: student info header */}
              <div className="no-print rounded-xl border border-border bg-card shadow-xs p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-foreground">
                      {selectedStudent.name}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedStudent.studentClass} – Section{" "}
                    {selectedStudent.section} · Father:{" "}
                    {selectedStudent.fatherName}
                  </p>
                  {reportCard && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Report card exists
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addSubject}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border text-foreground hover:bg-muted/40 transition-colors border-border"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Subject
                  </button>
                  <button
                    type="button"
                    onClick={addColumn}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border text-foreground hover:bg-muted/40 transition-colors border-border"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Column
                  </button>
                </div>
              </div>

              {/* Marks table */}
              {subjects.length === 0 || columns.length === 0 ? (
                <div className="rounded-xl border border-border bg-card shadow-xs py-12 text-center no-print">
                  <p className="text-muted-foreground text-sm">
                    Click "Add Subject" and "Add Column" to start building the
                    report card.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className="border-b border-border"
                          style={{ background: "oklch(0.93 0.05 155)" }}
                        >
                          <th className="text-left px-4 py-3 text-xs font-semibold text-foreground uppercase tracking-wide min-w-40">
                            Subject
                          </th>
                          {columns.map((col, ci) => (
                            <th
                              key={`col-header-${ci}-${col}`}
                              className="px-3 py-2 text-center min-w-24"
                            >
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="text"
                                  value={col}
                                  onChange={(e) =>
                                    updateColumnName(ci, e.target.value)
                                  }
                                  className="no-print w-16 px-1.5 py-1 text-xs font-semibold text-center border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                  aria-label={`Column ${ci + 1} name`}
                                />
                                <span className="print:inline hidden font-semibold text-xs text-foreground">
                                  {col}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeColumn(ci)}
                                  className="no-print p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Remove column"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </th>
                          ))}
                          <th className="no-print px-3 py-2 text-xs font-semibold text-muted-foreground" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {subjects.map((subject, ri) => (
                          <tr
                            key={`row-${ri}-${subject}`}
                            className="hover:bg-muted/10 transition-colors"
                          >
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={subject}
                                onChange={(e) =>
                                  updateSubjectName(ri, e.target.value)
                                }
                                className="no-print w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                aria-label={`Subject ${ri + 1} name`}
                              />
                              <span className="print:inline hidden text-sm font-medium">
                                {subject}
                              </span>
                            </td>
                            {columns.map((col, ci) => (
                              <td
                                key={`cell-${ri}-${ci}-${col}`}
                                className="px-3 py-2 text-center"
                              >
                                <input
                                  type="number"
                                  value={marks[ri]?.[ci] ?? 0}
                                  onChange={(e) =>
                                    updateMark(ri, ci, e.target.value)
                                  }
                                  className="no-print w-16 px-1.5 py-1 text-sm text-center border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  min={0}
                                  aria-label={`${subject} ${columns[ci]} marks`}
                                />
                                <span className="print:inline hidden text-sm font-medium">
                                  {marks[ri]?.[ci] ?? 0}
                                </span>
                              </td>
                            ))}
                            <td className="no-print px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeSubject(ri)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                title="Remove subject"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Print footer */}
                  <div className="hidden print:block px-5 py-4 border-t border-gray-300 mt-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center border-t border-gray-400 pt-2 mt-8">
                        <p>Class Teacher's Sign</p>
                      </div>
                      <div className="text-center border-t border-gray-400 pt-2 mt-8">
                        <p>Parent's Sign</p>
                      </div>
                      <div className="text-center border-t border-gray-400 pt-2 mt-8">
                        <p>Principal's Sign</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="no-print flex gap-3 justify-end">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print Report Card
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: "oklch(0.48 0.15 155)" }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Report Card
              </button>
            </div>
          </>
        )}

      {!selectedStudentId && !loadingStudents && (
        <div className="rounded-xl border border-border bg-card shadow-xs py-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Select a student to view or create their report card
          </p>
        </div>
      )}
    </div>
  );
}
