export const medicineTypes = [
  "Injection",
  "Syrup",
  "Tablet",
  "Capsule",
  "Ointments & Creams",
  "Sprays",
  "Drops",
  "Effervescent Tablets",
  "Sachets",
];
export type DiscountType = "percent" | "fixed";
export type Status = "paid" | "partial" | "pending";
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}
export interface Product {
  company?: string;
  _id: string;
  name: string;
  type: string;
  strength: string;
  purchasePriceCents: number;
  salePriceCents: number;
  discountType: DiscountType;
  discountValue: number;
  stock: number;
  quantityPerPacking: number;
  alarmType: "packing" | "quantity";
  alarmLimit: number;
  version: number;
  stockCostCents?: number;
  packsSold?: number;
  unitsSold?: number;
  salesCents?: number;
  netProfitCents?: number;
  profitEstimated?: boolean;
}
export interface Customer {
  _id: string;
  name: string;
  address: string;
  phone: string;
  balanceCents: number;
}
export interface OrderItem {
  productId: string;
  name: string;
  type: string;
  strength: string;
  company?: string;
  quantity: number;
  quantityPerPacking: number;
  unitPriceCents: number;
  discountType: DiscountType;
  discountValue: number;
  netUnitPriceCents: number;
  totalCents: number;
}
export interface Order {
  remarks?: string;
  _id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  items: OrderItem[];
  subtotalCents: number;
  profitCents?: number | null;
  profitEstimated?: boolean;
  discountCents: number;
  totalCents: number;
  previousPendingCents: number;
  grandTotalCents: number;
  receivedCents: number;
  remainingCents: number;
  status: Status;
  statusUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  statusHistory: { status: Status; at: string; receivedCents: number }[];
}
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface Dashboard {
  productCount: number;
  lowStockCount: number;
  customerCount: number;
  balanceCents: number;
  salesCents: number;
  receivedCents: number;
  orderCount: number;
  lowStock: Product[];
  recentOrders: Order[];
  trend: { _id: string; total: number }[];
  stockCostCents: number;
  lifetimeSalesCents: number;
  soldPacks: number;
  soldUnits: number;
  netProfitCents: number;
  profitEstimated: boolean;
  expenseCents: number;
  monthlyExpenseCents: number;
  monthlyProfitCents: number;
  monthlyProfitAfterExpenseCents: number;
  profitAfterExpenseCents: number;
}
export interface Expense {
  _id: string;
  date: string;
  category: string;
  description: string;
  amountCents: number;
}
export interface ExpensePage extends Page<Expense> { amountCents: number }
export interface ReportMetrics {
  packsSold: number;
  unitsSold: number;
  salesCents: number;
  stockSpentCents: number;
  profitCents: number;
  profitEstimated: boolean;
  expenseCents: number;
  profitAfterExpenseCents: number;
  stockLeftCents?: number;
}
export interface BusinessReport {
  from: string;
  to: string;
  lifetime: ReportMetrics;
  period: ReportMetrics;
}
