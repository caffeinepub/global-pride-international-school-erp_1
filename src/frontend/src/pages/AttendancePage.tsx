import { useState } from "react";
import { toast } from "sonner";
import { UserCheck, UserX, Loader2, MessageSquare } from "lucide-react";
import { useBackend } from "../hooks/useBackend";
import { AttendanceStatus } from "../backend";
import type { Student } from "../backend";
import { CLASSES, SECTIONS } from "../utils/constants";

interface AttendanceRecord {
  studentId: bigint;
  name: string;
  contactNumber: string;
  status: AttendanceStatus;
}

export default function AttendancePage() {
  const { backend } = useBackend();
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [selectedSection, setSelectedSection] = useState(SECTIONS[0]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleLoadStudents = async () => {
    if (!backend) { toast.error("Backend not ready"); return; }
    setLoadingStudents(true);
    try {
      const allStudents: Student[] = await backend.getAllStudents();
      const filtered = allStudents.filter(
        (s) => s.studentClass === selectedClass && s.section === selectedSection,
      );
      if (filtered.length === 0) {
        toast.error("No students found for this class and section");
        setRecords([]);
        setLoaded(false);
        return;
      }
      setRecords(
        filtered.map((s) => ({
          studentId: s.id,
          name: s.name,
          contactNumber: s.contactNumber,
          status: AttendanceStatus.Present,
        })),
      );
      setLoaded(true);
      toast.success(`${filtered.length} students loaded`);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStatus = (id: bigint) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.studentId === id
          ? { ...r, status: r.status === AttendanceStatus.Present ? AttendanceStatus.Absent : AttendanceStatus.Present }
          : r,
      ),
    );
  };

  const handleSave = async () => {
    if (!backend) { toast.error("Backend not ready"); return; }
    if (!loaded || records.length === 0) {
      toast.error("No attendance records to save");
      return;
    }
    setSaving(true);
    try {
      const dateTs = BigInt(new Date(selectedDate).getTime());
      const classSection = `${selectedClass}-${selectedSection}`;
      const attendanceRecords: [bigint, string, AttendanceStatus][] = records.map((r) => [
        r.studentId,
        r.name,
        r.status,
      ]);
      await backend.saveAttendance(dateTs, classSection, attendanceRecords);
      toast.success("Attendance saved successfully!");
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = records.filter((r) => r.status === AttendanceStatus.Present).length;
  const absentCount = records.filter((r) => r.status === AttendanceStatus.Absent).length;
  const absentStudents = records.filter((r) => r.status === AttendanceStatus.Absent);

  const markAll = (status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Attendance</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Mark daily attendance for classes</p>
      </div>

      {/* Filters card */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="att-class" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Class
            </label>
            <select
              id="att-class"
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setLoaded(false); setRecords([]); }}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="att-section" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Section
            </label>
            <select
              id="att-section"
              value={selectedSection}
              onChange={(e) => { setSelectedSection(e.target.value); setLoaded(false); setRecords([]); }}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="att-date" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Date
            </label>
            <input
              id="att-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleLoadStudents}
              disabled={loadingStudents}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: "oklch(0.48 0.15 155)" }}
            >
              {loadingStudents && <Loader2 className="h-4 w-4 animate-spin" />}
              Load Students
            </button>
          </div>
        </div>
      </div>

      {/* Attendance list */}
      {loaded && records.length > 0 && (
        <>
          {/* Stats + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">Present: {presentCount}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-700">Absent: {absentCount}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => markAll(AttendanceStatus.Present)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => markAll(AttendanceStatus.Absent)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
              >
                All Absent
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/10">
              <p className="text-sm font-semibold text-foreground">
                {selectedClass} – Section {selectedSection} · {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="divide-y divide-border">
              {records.map((record, idx) => (
                <div
                  key={record.studentId.toString()}
                  className={`flex items-center justify-between px-5 py-3.5 transition-colors ${
                    record.status === AttendanceStatus.Absent ? "bg-red-50/50" : "hover:bg-muted/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6 text-center font-mono">{idx + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{record.name}</p>
                      <p className="text-xs text-muted-foreground">{record.contactNumber}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => record.status !== AttendanceStatus.Present && toggleStatus(record.studentId)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        record.status === AttendanceStatus.Present
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700"
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => record.status !== AttendanceStatus.Absent && toggleStatus(record.studentId)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        record.status === AttendanceStatus.Absent
                          ? "bg-red-500 text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-700"
                      }`}
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SMS Previews for absent students */}
          {absentStudents.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-amber-800">SMS Preview for Absent Students</h4>
              </div>
              <div className="space-y-2">
                {absentStudents.map((s) => (
                  <div key={s.studentId.toString()} className="text-xs text-amber-700 bg-white/70 rounded-lg px-3 py-2 border border-amber-100">
                    📱 <strong>To: {s.contactNumber}</strong> — Your child <strong>{s.name}</strong> was absent today ({new Date(selectedDate).toLocaleDateString("en-IN")}) at Global Pride International School. For queries contact school. Thank you.
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: "oklch(0.48 0.15 155)" }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Attendance
            </button>
          </div>
        </>
      )}

      {!loaded && (
        <div className="rounded-xl border border-border bg-card shadow-xs py-16 text-center">
          <p className="text-muted-foreground text-sm">Select class, section, and date, then click <strong>Load Students</strong></p>
        </div>
      )}
    </div>
  );
}
