import type { DiscountType } from "./types";
export const money = (cents: number) =>
  `PKR ${(cents / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dateTime = (date: string) =>
  new Date(date).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
export const shortDate = (date: string) =>
  new Date(date).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
export const netPrice = (price: number, type: DiscountType, value: number) =>
  type === "percent"
    ? Math.round(price * (1 - value / 100))
    : price - Math.round(value * 100);
