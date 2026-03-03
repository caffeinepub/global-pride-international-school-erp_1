import type { FeeCategory } from "./localStore";

export const CLASSES = [
  "Nursery",
  "PP1",
  "PP2",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
];

export const SECTIONS = ["A", "B", "C", "D", "E"];

export const DEFAULT_FEES: Record<string, number> = {
  Nursery: 15000,
  PP1: 16000,
  PP2: 17000,
  "Grade 1": 18000,
  "Grade 2": 19000,
  "Grade 3": 20000,
  "Grade 4": 21000,
  "Grade 5": 22000,
  "Grade 6": 24000,
  "Grade 7": 26000,
  "Grade 8": 28000,
  "Grade 9": 30000,
  "Grade 10": 32000,
};

export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  OTP: "One Time Payment",
  HalfYearly: "Half Yearly",
  Term1: "Term 1",
  Term2: "Term 2",
  Term3: "Term 3",
  Monthly: "Monthly",
};

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Returns today's date as a YYYY-MM-DD string using LOCAL time,
 * so it matches the device's calendar date on all pages consistently.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(timestamp: number | bigint): string {
  const ms = Number(timestamp);
  // Use local date parts to avoid UTC timezone shift (e.g. IST = UTC+5:30)
  const d = new Date(ms);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

/**
 * Parses a YYYY-MM-DD string into a Date at local midnight (no UTC shift).
 * Use this instead of new Date("YYYY-MM-DD") to avoid timezone off-by-one.
 */
export function parseDateString(dateStr: string): Date {
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

export function getInstallmentAmount(
  finalFee: number,
  category: FeeCategory,
): number {
  switch (category) {
    case "OTP":
      return finalFee;
    case "HalfYearly":
      return Math.round(finalFee / 2);
    case "Term1":
    case "Term2":
    case "Term3":
      return Math.round(finalFee / 3);
    case "Monthly":
      return Math.round(finalFee / 10);
    default:
      return finalFee;
  }
}
