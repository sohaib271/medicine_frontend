export interface ChallanItem {
  name: string;
  strength?: string;
  type: string;
  quantity: number;
  packs: number;
  piecesPerPack: number;
  company: string;
}
export interface Challan {
  customerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  remarks?: string;
  _id: string;
  challanNumber: string;
  items: ChallanItem[];
  status: "pending" | "delivered";
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
  version: number;
}
