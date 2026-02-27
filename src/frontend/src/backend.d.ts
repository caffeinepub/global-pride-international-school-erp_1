import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface StudentExtras {
    studentId: bigint;
    dateOfBirth: string;
    aadharNo: string;
    admissionNo: string;
}
export interface TransportMonthlyPayment {
    id: bigint;
    month: bigint;
    studentId: bigint;
    paid: boolean;
    year: bigint;
}
export type Time = bigint;
export interface TransportStudent {
    id: bigint;
    transportOption: TransportOption;
    name: string;
    isActive: boolean;
    fatherName: string;
    contactNumber: string;
    monthlyPayments: Array<TransportMonthlyPayment>;
    monthlyFee: number;
}
export interface ReportCard {
    studentId: bigint;
    subjects: Array<string>;
    marksEntries: Array<Array<number>>;
    columns: Array<string>;
}
export interface Payment {
    id: bigint;
    studentId: bigint;
    amountPaid: number;
    paymentDate: Time;
    paymentMode: PaymentMode;
    feeCategory: FeeCategory;
}
export interface Student {
    id: bigint;
    payments: Array<Payment>;
    discountAmount: number;
    name: string;
    section: string;
    motherName: string;
    feePaymentCategory: FeeCategory;
    reportCard?: ReportCard;
    totalFee: number;
    examFeesSA1: number;
    examFeesSA2: number;
    fatherName: string;
    contactNumber: string;
    studentClass: string;
    finalFee: number;
}
export enum AttendanceStatus {
    Present = "Present",
    Absent = "Absent"
}
export enum FeeCategory {
    OTP = "OTP",
    Monthly = "Monthly",
    Term1 = "Term1",
    Term2 = "Term2",
    Term3 = "Term3",
    HalfYearly = "HalfYearly"
}
export enum PaymentMode {
    UPI = "UPI",
    Cash = "Cash",
    BankTransfer = "BankTransfer"
}
export enum TransportOption {
    OnlyPickUp = "OnlyPickUp",
    OnlyDrop = "OnlyDrop",
    PickUpDrop = "PickUpDrop"
}
export interface backendInterface {
    addFeePayment(studentId: bigint, amountPaid: number, paymentDate: Time, paymentMode: PaymentMode, feeCategory: FeeCategory): Promise<bigint>;
    addStudent(name: string, studentClass: string, section: string, fatherName: string, motherName: string, contactNumber: string, totalFee: number, feePaymentCategory: FeeCategory, discountAmount: number, finalFee: number, examFeesSA1: number, examFeesSA2: number): Promise<bigint>;
    addTransportStudent(name: string, fatherName: string, contactNumber: string, transportOption: TransportOption, monthlyFee: number): Promise<bigint>;
    deleteStudent(id: bigint): Promise<void>;
    deleteTransportStudent(id: bigint): Promise<void>;
    getAllStudentExtras(): Promise<Array<StudentExtras>>;
    getAllStudents(): Promise<Array<Student>>;
    getReportCard(studentId: bigint): Promise<ReportCard | null>;
    getStudentById(id: bigint): Promise<Student | null>;
    getStudentExtras(studentId: bigint): Promise<StudentExtras | null>;
    getUnpaidTransportStudents(month: bigint, year: bigint): Promise<Array<TransportStudent>>;
    markTransportFeePaid(studentId: bigint, month: bigint, year: bigint): Promise<void>;
    saveAttendance(date: Time, classSection: string, records: Array<[bigint, string, AttendanceStatus]>): Promise<void>;
    saveOrUpdateReportCard(studentId: bigint, subjects: Array<string>, columns: Array<string>, marksEntries: Array<Array<number>>): Promise<void>;
    setStudentExtras(studentId: bigint, dateOfBirth: string, aadharNo: string, admissionNo: string): Promise<void>;
    updateStudent(id: bigint, name: string, studentClass: string, section: string, fatherName: string, motherName: string, contactNumber: string, totalFee: number, feePaymentCategory: FeeCategory, discountAmount: number, finalFee: number, examFeesSA1: number, examFeesSA2: number): Promise<void>;
    updateTransportStudent(id: bigint, name: string, fatherName: string, contactNumber: string, transportOption: TransportOption, monthlyFee: number): Promise<void>;
}
