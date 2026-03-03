// ─── Types ────────────────────────────────────────────────────────────────────

export type FeeCategory =
  | "OTP"
  | "HalfYearly"
  | "Term1"
  | "Term2"
  | "Term3"
  | "Monthly";
export type PaymentMode = "Cash" | "UPI" | "BankTransfer";
export type TransportOption = "PickUpDrop" | "OnlyPickUp" | "OnlyDrop";
export type AttendanceStatus = "Present" | "Absent";

export const AttendanceStatusEnum = {
  Present: "Present" as AttendanceStatus,
  Absent: "Absent" as AttendanceStatus,
};

export const FeeCategoryEnum = {
  OTP: "OTP" as FeeCategory,
  HalfYearly: "HalfYearly" as FeeCategory,
  Term1: "Term1" as FeeCategory,
  Term2: "Term2" as FeeCategory,
  Term3: "Term3" as FeeCategory,
  Monthly: "Monthly" as FeeCategory,
};

export const PaymentModeEnum = {
  Cash: "Cash" as PaymentMode,
  UPI: "UPI" as PaymentMode,
  BankTransfer: "BankTransfer" as PaymentMode,
};

export const TransportOptionEnum = {
  PickUpDrop: "PickUpDrop" as TransportOption,
  OnlyPickUp: "OnlyPickUp" as TransportOption,
  OnlyDrop: "OnlyDrop" as TransportOption,
};

export interface ReportCard {
  studentId: number;
  subjects: string[];
  columns: string[];
  marksEntries: number[][];
}

export interface Payment {
  id: number;
  studentId: number;
  amountPaid: number;
  paymentDate: number; // timestamp ms
  paymentMode: PaymentMode;
  feeCategory: FeeCategory;
}

export interface Student {
  id: number;
  name: string;
  studentClass: string;
  section: string;
  fatherName: string;
  motherName: string;
  contactNumber: string;
  totalFee: number;
  feePaymentCategory: FeeCategory;
  discountAmount: number;
  finalFee: number;
  examFeesSA1: number;
  examFeesSA2: number;
  reportCard?: ReportCard;
  payments: Payment[];
}

export interface StudentExtras {
  studentId: number;
  dateOfBirth: string;
  aadharNo: string;
  admissionNo: string;
}

export interface TransportMonthlyPayment {
  id: number;
  studentId: number;
  month: number;
  year: number;
  paid: boolean;
}

export interface TransportStudent {
  id: number;
  name: string;
  fatherName: string;
  contactNumber: string;
  transportOption: TransportOption;
  monthlyFee: number;
  isActive: boolean;
  monthlyPayments: TransportMonthlyPayment[];
}

export interface AttendanceRecord {
  id: number;
  date: number; // timestamp ms
  studentId: number;
  studentName: string;
  status: AttendanceStatus;
  studentClass: string;
  section: string;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  students: "gpis_students",
  attendance: "gpis_attendance",
  transport: "gpis_transport",
  extras: "gpis_extras",
  counters: "gpis_counters",
} as const;

interface Counters {
  nextStudentId: number;
  nextAttendanceId: number;
  nextTransportId: number;
  nextPaymentId: number;
  nextTransportPaymentId: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCounters(): Counters {
  return readJSON<Counters>(KEYS.counters, {
    nextStudentId: 1,
    nextAttendanceId: 1,
    nextTransportId: 1,
    nextPaymentId: 1,
    nextTransportPaymentId: 1,
  });
}

function saveCounters(c: Counters): void {
  writeJSON(KEYS.counters, c);
}

function nextId(field: keyof Counters): number {
  const c = getCounters();
  const id = c[field];
  c[field] = id + 1;
  saveCounters(c);
  return id;
}

// ─── Students ─────────────────────────────────────────────────────────────────

export function getAllStudents(): Student[] {
  return readJSON<Student[]>(KEYS.students, []);
}

export function getStudentById(id: number): Student | undefined {
  return getAllStudents().find((s) => s.id === id);
}

export function addStudent(
  data: Omit<Student, "id" | "reportCard" | "payments">,
): number {
  const id = nextId("nextStudentId");
  const students = getAllStudents();
  const newStudent: Student = { ...data, id, payments: [] };
  students.push(newStudent);
  writeJSON(KEYS.students, students);
  return id;
}

export function updateStudent(
  id: number,
  data: Omit<Student, "id" | "reportCard" | "payments">,
): void {
  const students = getAllStudents();
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) return;
  const existing = students[idx];
  students[idx] = {
    ...existing,
    ...data,
    id,
    payments: existing.payments,
    reportCard: existing.reportCard,
  };
  writeJSON(KEYS.students, students);
}

export function deleteStudent(id: number): void {
  const students = getAllStudents().filter((s) => s.id !== id);
  writeJSON(KEYS.students, students);
  // Also delete extras
  const extras = getAllStudentExtras().filter((e) => e.studentId !== id);
  writeJSON(KEYS.extras, extras);
}

// ─── Fee Payments ─────────────────────────────────────────────────────────────

export function addFeePayment(
  studentId: number,
  amountPaid: number,
  paymentDate: number,
  paymentMode: PaymentMode,
  feeCategory: FeeCategory,
): number {
  const paymentId = nextId("nextPaymentId");
  const students = getAllStudents();
  const idx = students.findIndex((s) => s.id === studentId);
  if (idx === -1) throw new Error("Student not found");
  const payment: Payment = {
    id: paymentId,
    studentId,
    amountPaid,
    paymentDate,
    paymentMode,
    feeCategory,
  };
  students[idx].payments.push(payment);
  writeJSON(KEYS.students, students);
  return paymentId;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export function saveAttendance(
  date: number,
  classSection: string,
  records: Array<{
    studentId: number;
    studentName: string;
    status: AttendanceStatus;
  }>,
): void {
  const allRecords = getAttendanceRecords();
  const [studentClass, section] = classSection.split("-");

  // Remove existing records for this date + class-section combo
  const filtered = allRecords.filter(
    (r) =>
      !(
        r.date === date &&
        r.studentClass === studentClass &&
        r.section === section
      ),
  );

  for (const rec of records) {
    const id = nextId("nextAttendanceId");
    filtered.push({
      id,
      date,
      studentId: rec.studentId,
      studentName: rec.studentName,
      status: rec.status,
      studentClass,
      section,
    });
  }

  writeJSON(KEYS.attendance, filtered);
}

export function getAttendanceRecords(): AttendanceRecord[] {
  return readJSON<AttendanceRecord[]>(KEYS.attendance, []);
}

// ─── Transport ────────────────────────────────────────────────────────────────

export function getAllTransportStudents(): TransportStudent[] {
  return readJSON<TransportStudent[]>(KEYS.transport, []);
}

export function addTransportStudent(
  data: Omit<TransportStudent, "id" | "monthlyPayments" | "isActive">,
): number {
  const id = nextId("nextTransportId");
  const students = getAllTransportStudents();
  const newStudent: TransportStudent = {
    ...data,
    id,
    isActive: true,
    monthlyPayments: [],
  };
  students.push(newStudent);
  writeJSON(KEYS.transport, students);
  return id;
}

export function updateTransportStudent(
  id: number,
  data: Omit<TransportStudent, "id" | "monthlyPayments" | "isActive">,
): void {
  const students = getAllTransportStudents();
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) return;
  const existing = students[idx];
  students[idx] = {
    ...existing,
    ...data,
    id,
    monthlyPayments: existing.monthlyPayments,
    isActive: existing.isActive,
  };
  writeJSON(KEYS.transport, students);
}

export function deleteTransportStudent(id: number): void {
  const students = getAllTransportStudents().filter((s) => s.id !== id);
  writeJSON(KEYS.transport, students);
}

export function markTransportFeePaid(
  studentId: number,
  month: number,
  year: number,
): void {
  const students = getAllTransportStudents();
  const idx = students.findIndex((s) => s.id === studentId);
  if (idx === -1) return;
  const student = students[idx];
  // Remove any existing entry for this month/year and re-add as paid
  student.monthlyPayments = student.monthlyPayments.filter(
    (p) => !(p.month === month && p.year === year),
  );
  const payId = nextId("nextTransportPaymentId");
  student.monthlyPayments.push({
    id: payId,
    studentId,
    month,
    year,
    paid: true,
  });
  writeJSON(KEYS.transport, students);
}

export function getUnpaidTransportStudents(
  month: number,
  year: number,
): TransportStudent[] {
  const all = getAllTransportStudents();
  if (month === 0 && year === 0) return all;
  return all.filter(
    (s) =>
      !s.monthlyPayments.some(
        (p) => p.month === month && p.year === year && p.paid,
      ),
  );
}

// ─── Report Cards ─────────────────────────────────────────────────────────────

export function saveOrUpdateReportCard(
  studentId: number,
  subjects: string[],
  columns: string[],
  marksEntries: number[][],
): void {
  const students = getAllStudents();
  const idx = students.findIndex((s) => s.id === studentId);
  if (idx === -1) return;
  students[idx].reportCard = { studentId, subjects, columns, marksEntries };
  writeJSON(KEYS.students, students);
}

export function getReportCard(studentId: number): ReportCard | undefined {
  const student = getStudentById(studentId);
  return student?.reportCard;
}

// ─── Student Extras ───────────────────────────────────────────────────────────

export function setStudentExtras(
  studentId: number,
  dateOfBirth: string,
  aadharNo: string,
  admissionNo: string,
): void {
  const extras = getAllStudentExtras().filter((e) => e.studentId !== studentId);
  extras.push({ studentId, dateOfBirth, aadharNo, admissionNo });
  writeJSON(KEYS.extras, extras);
}

export function getStudentExtras(studentId: number): StudentExtras | undefined {
  return getAllStudentExtras().find((e) => e.studentId === studentId);
}

export function getAllStudentExtras(): StudentExtras[] {
  return readJSON<StudentExtras[]>(KEYS.extras, []);
}

// ─── Clear All Data ───────────────────────────────────────────────────────────

export function clearAllData(): void {
  localStorage.removeItem(KEYS.students);
  localStorage.removeItem(KEYS.attendance);
  localStorage.removeItem(KEYS.transport);
  localStorage.removeItem(KEYS.extras);
  localStorage.removeItem(KEYS.counters);
  // Also clear old transport payment keys from previous implementation
  localStorage.removeItem("transport_payments");
  localStorage.removeItem("transport_bill_counter");
  // Clear transport student class keys
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("transport_student_class_")) {
      localStorage.removeItem(key);
    }
  }
}
