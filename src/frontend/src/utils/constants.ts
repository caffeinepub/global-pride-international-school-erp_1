import { FeeCategory } from "../backend.d";

export const CLASSES = [
  "Nursery", "PP1", "PP2",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];

export const SECTIONS = ["A", "B", "C", "D", "E"];

export const DEFAULT_FEES: Record<string, number> = {
  "Nursery": 15000,
  "PP1": 16000,
  "PP2": 17000,
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
  [FeeCategory.OTP]: "One Time Payment",
  [FeeCategory.HalfYearly]: "Half Yearly",
  [FeeCategory.Term1]: "Term 1",
  [FeeCategory.Term2]: "Term 2",
  [FeeCategory.Term3]: "Term 3",
  [FeeCategory.Monthly]: "Monthly",
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp);
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getInstallmentAmount(finalFee: number, category: FeeCategory): number {
  switch (category) {
    case FeeCategory.OTP: return finalFee;
    case FeeCategory.HalfYearly: return Math.round(finalFee / 2);
    case FeeCategory.Term1:
    case FeeCategory.Term2:
    case FeeCategory.Term3: return Math.round(finalFee / 3);
    case FeeCategory.Monthly: return Math.round(finalFee / 10);
    default: return finalFee;
  }
}
