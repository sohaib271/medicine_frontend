import { useMemo, useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, apiUrl, body, queryString } from "../lib/api";
import { dateTime, money, netPrice } from "../lib/format";
import type { Customer, DiscountType, Page, Product, Warranty } from "../lib/types";
import { Button, Confirm, Empty, ErrorState, Field, Loading, Modal, PageHeader, Pagination, SearchBox } from "../components/ui";

type DraftLine = {
  productId: string; name: string; strength: string; batchNumber: string; quantity: number;
  quantityPerPacking: number; unitPriceCents: number;
  discountType: DiscountType; discountValue: number;
};

function WarrantyForm({ warranty, close }: { warranty?: Warranty; close: () => void }) {
  const client = useQueryClient();
  const [requestId] = useState(() => crypto.randomUUID());
  const [customerId, setCustomerId] = useState(warranty?.customerId ?? "");
  const [productSearch, setProductSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(() => warranty?.items.map((item) => ({
    productId: item.productId, name: item.name, strength: item.strength,
    batchNumber: item.batchNumber ?? "", quantity: item.quantity,
    quantityPerPacking: item.quantityPerPacking, unitPriceCents: item.unitPriceCents,
    discountType: item.discountType, discountValue: item.discountValue,
  })) ?? []);
  const [overallDiscount, setOverallDiscount] = useState((warranty?.overallDiscountCents ?? 0) / 100);
  const [remarks, setRemarks] = useState(warranty?.remarks ?? "");
  const customers = useQuery({ queryKey: ["customers", "warranty"], queryFn: () => api<Page<Customer>>("/customers?limit=100") });
  const products = useQuery({ queryKey: ["products", "warranty", productSearch], queryFn: () => api<Page<Product>>(`/products${queryString({ search: productSearch, limit: 100 })}`) });
  const selectedCustomer = customers.data?.data.find((customer) => customer._id === customerId);
  const itemTotal = useMemo(() => lines.reduce((sum, line) => sum + netPrice(line.unitPriceCents, line.discountType, line.discountValue) * line.quantity, 0), [lines]);
  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0), [lines]);
  const total = itemTotal - Math.round(overallDiscount * 100);
  const update = (index: number, changes: Partial<DraftLine>) => setLines((current) => current.map((line, i) => i === index ? { ...line, ...changes } : line));
  const addProduct = (product: Product) => {
    if (lines.some((line) => line.productId === product._id)) return toast.info("This medicine is already included.");
    setLines((current) => [...current, { productId: product._id, name: product.name, strength: product.strength, batchNumber: "", quantity: 1, quantityPerPacking: product.quantityPerPacking ?? 1, unitPriceCents: product.salePriceCents, discountType: product.discountType, discountValue: product.discountValue }]);
  };
  const save = useMutation({
    mutationFn: () => api<Warranty>(warranty ? `/warranties/${warranty._id}` : "/warranties", body(warranty ? "PUT" : "POST", {
      ...(!warranty ? { requestId } : { version: warranty.version }), customerId, overallDiscount, remarks,
      items: lines.map((line) => ({ productId: line.productId, batchNumber: line.batchNumber.trim(), quantity: line.quantity, salePrice: line.unitPriceCents / 100, discountType: line.discountType, discountValue: line.discountValue })),
    })),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["warranties"] }); toast.success(warranty ? "Warranty updated" : "Warranty created"); close(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!lines.length) return toast.error("Add at least one medicine.");
    if (total < 0) return toast.error("Overall discount cannot exceed the warranty amount.");
    save.mutate();
  };
  return <Modal title={warranty ? `Edit warranty ${warranty.warrantyNumber}` : "Create warranty"} subtitle="Prepare a warranty document with invoice-style pricing and discounts." onClose={close}>
    <form onSubmit={submit}><div className="modal-body space-y-5">
      <Field label="Customer"><select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Choose customer</option>{customers.data?.data.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}{customer.licenseNumber ? ` · Lic: ${customer.licenseNumber}` : ""}</option>)}</select></Field>
      {selectedCustomer && <div className="info-note"><ShieldCheck size={16} /><p>License No: {selectedCustomer.licenseNumber || "Not provided — add it from Customers"}</p></div>}
      <Field label="Find medicine"><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search medicine name" /></Field>
      <div className="product-picker compact-picker">{products.data?.data.map((product) => <button type="button" className={`picker-item ${lines.some((line) => line.productId === product._id) ? "added" : ""}`} key={product._id} disabled={lines.some((line) => line.productId === product._id)} onClick={() => addProduct(product)}><div><strong>{product.name}</strong><small>{product.strength} · {money(product.salePriceCents)} / pack</small></div><Plus size={16} /></button>)}</div>
      <div className="warranty-lines">{lines.map((line, index) => <div className="order-line" key={line.productId}>
        <div className="line-title"><strong>{line.name}</strong><small>{line.strength} · {line.quantityPerPacking} units per pack</small><button type="button" className="icon-button text-red-600 ml-auto" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}><Trash2 size={16} /></button></div>
        <div className="warranty-line-fields">
          <Field label="Batch No."><input required maxLength={80} value={line.batchNumber} placeholder="e.g. B-24017" onChange={(e) => update(index, { batchNumber: e.target.value })} /></Field>
          <Field label="Packs"><input required type="number" min={1} step={1} value={line.quantity} onChange={(e) => update(index, { quantity: Number(e.target.value) })} /></Field>
          <Field label="Sale price / pack"><input required type="number" min={0} step="0.01" value={line.unitPriceCents / 100} onChange={(e) => update(index, { unitPriceCents: Math.round(Number(e.target.value) * 100) })} /></Field>
          <Field label="Discount type"><select value={line.discountType} onChange={(e) => update(index, { discountType: e.target.value as DiscountType, discountValue: 0 })}><option value="percent">Percentage</option><option value="fixed">Fixed PKR</option></select></Field>
          <Field label="Discount / pack"><input required type="number" min={0} step="0.01" max={line.discountType === "percent" ? 100 : line.unitPriceCents / 100} value={line.discountValue} onChange={(e) => update(index, { discountValue: Number(e.target.value) })} /></Field>
          <div className="line-total"><small>Total</small><strong>{money(netPrice(line.unitPriceCents, line.discountType, line.discountValue) * line.quantity)}</strong></div>
        </div>
      </div>)}</div>
      <div className="warranty-summary"><div className="summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="summary-row"><span>Item discounts</span><strong>− {money(subtotal - itemTotal)}</strong></div><Field label="Overall discount (PKR)"><input required type="number" min={0} max={itemTotal / 100} step="0.01" value={overallDiscount} onChange={(e) => setOverallDiscount(Number(e.target.value))} /></Field><div className="grand-total"><span>Warranty total</span><strong>{money(Math.max(0, total))}</strong></div></div>
      <Field label="Remarks"><textarea rows={2} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
    </div><div className="modal-footer"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button disabled={save.isPending}>{save.isPending ? "Saving…" : warranty ? "Save changes" : "Create warranty"}</Button></div></form>
  </Modal>;
}

export default function Warranties() {
  const [page, setPage] = useState(1); const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false); const [editing, setEditing] = useState<Warranty | null>(null); const [deleting, setDeleting] = useState<Warranty | null>(null);
  const query = useQuery({ queryKey: ["warranties", page, search], queryFn: () => api<Page<Warranty>>(`/warranties${queryString({ page, search })}`), placeholderData: keepPreviousData });
  const download = useMutation({ mutationFn: async (warranty: Warranty) => { const response = await fetch(apiUrl(`/warranties/${warranty._id}/pdf`), { credentials: "include" }); if (!response.ok) throw new Error("Could not download warranty PDF."); const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `warranty-${warranty.warrantyNumber}.pdf`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }, onError: (error: Error) => toast.error(error.message) });
  const remove = useMutation({ mutationFn: (warranty: Warranty) => api(`/warranties/${warranty._id}`, body("DELETE", { version: warranty.version })), onSuccess: async () => { await query.refetch(); setDeleting(null); toast.success("Warranty deleted"); }, onError: (error: Error) => toast.error(error.message) });
  return <><PageHeader eyebrow="PRODUCT WARRANTY RECORDS" title="Warranties" description="Create invoice-style product warranties with customer license details."><Button onClick={() => setAdding(true)}><Plus size={17} /> Add warranty</Button></PageHeader>
    <section className="panel"><div className="list-toolbar"><h2>Warranty documents</h2><SearchBox value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search warranty or customer…" /></div>
      {query.isPending ? <Loading /> : query.error ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : query.data.data.length ? <><div className="table-scroll"><table><thead><tr><th>Warranty</th><th>Customer</th><th>License No .</th><th>Products</th><th>Total</th><th>Created</th><th /></tr></thead><tbody>{query.data.data.map((warranty) => <tr key={warranty._id}><td><strong>{warranty.warrantyNumber}</strong></td><td>{warranty.customerName}</td><td>{warranty.customerLicenseNumber || "—"}</td><td>{warranty.items.length}</td><td className="font-semibold">{money(warranty.totalCents)}</td><td>{dateTime(warranty.createdAt)}</td><td><button className="icon-button" aria-label={`Edit warranty ${warranty.warrantyNumber}`} title="Edit warranty" onClick={() => setEditing(warranty)}><Pencil size={16} /></button><button className="icon-button" aria-label={`Download warranty ${warranty.warrantyNumber}`} title="Download warranty" onClick={() => download.mutate(warranty)}><Download size={16} /></button><button className="icon-button text-red-600" aria-label={`Delete warranty ${warranty.warrantyNumber}`} title="Delete warranty" onClick={() => setDeleting(warranty)}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div><Pagination page={page} pages={query.data.pages} total={query.data.total} setPage={setPage} /></> : <Empty title="No warranties yet" text="Create a warranty to generate the invoice-style PDF." />}
    </section>{adding && <WarrantyForm close={() => setAdding(false)} />}{editing && <WarrantyForm warranty={editing} close={() => setEditing(null)} />}{deleting && <Confirm danger title="Delete this warranty?" text={`Warranty ${deleting.warrantyNumber} will be removed.`} onClose={() => setDeleting(null)} onConfirm={() => remove.mutate(deleting)} pending={remove.isPending} />}</>;
}
