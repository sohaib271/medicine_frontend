import { useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Pencil, Pill, Plus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { api, body, queryString } from "../lib/api";
import { useDebounced, useRefresh } from "../lib/hooks";
import { medicineTypes, type Page, type Product } from "../lib/types";
import { money } from "../lib/format";
import {
  Button,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeader,
  Pagination,
  SearchBox,
} from "../components/ui";
function ProductForm({
  product,
  close,
}: {
  product: Product | null;
  close: () => void;
}) {
  const refresh = useRefresh();
  const [form, setForm] = useState({
    name: product?.name ?? "",
    type: product?.type ?? "Tablet",
    strength: product?.strength ?? "",
    purchasePrice: product ? product.purchasePriceCents / 100 : 0,
    salePrice: product ? product.salePriceCents / 100 : 0,
    discountType: product?.discountType ?? "percent",
    discountValue: product?.discountValue ?? 0,
    stock: product?.stock ?? 0,
    alarmLimit: product?.alarmLimit ?? 10,
  });
  const save = useMutation({
    mutationFn: () =>
      api(
        `/products${product ? `/${product._id}` : ""}`,
        body(product ? "PUT" : "POST", {
          ...form,
          ...(product ? { version: product.version } : {}),
        }),
      ),
    onSuccess: async () => {
      await refresh();
      toast.success(product ? "Medicine updated" : "Medicine added");
      close();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }
  return (
    <Modal
      title={product ? "Edit medicine" : "Add a medicine"}
      subtitle="A well-organized catalog starts with the details."
      onClose={() => {
        if (!save.isPending) close();
      }}
    >
      <form onSubmit={submit}>
        <div className="modal-body form-grid">
          <Field label="Medicine name">
            <input
              autoFocus
              required
              maxLength={150}
              value={form.name}
              placeholder="e.g. Panadol"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Medicine type">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {medicineTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Strength / mg"
            hint="Include the unit, e.g. 500 mg or 5 mg/ml"
          >
            <input
              maxLength={60}
              value={form.strength}
              placeholder="500 mg"
              onChange={(e) => setForm({ ...form, strength: e.target.value })}
            />
          </Field>
          <div />
          {(["purchasePrice", "salePrice"] as const).map((key) => (
            <Field
              label={
                key === "purchasePrice"
                  ? "Purchase price (PKR)"
                  : "Sale price (PKR)"
              }
              key={key}
            >
              <input
                type="number"
                required
                min={0}
                max={10000000}
                step="0.01"
                value={form[key]}
                onChange={(e) =>
                  setForm({ ...form, [key]: Number(e.target.value) })
                }
              />
            </Field>
          ))}
          <Field label="Default discount type">
            <select
              value={form.discountType}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountType: e.target.value as "percent" | "fixed",
                })
              }
            >
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (PKR / unit)</option>
            </select>
          </Field>
          <Field
            label={`Discount ${form.discountType === "percent" ? "(%)" : "(PKR / unit)"}`}
          >
            <input
              required
              type="number"
              min={0}
              max={form.discountType === "percent" ? 100 : form.salePrice}
              step="0.01"
              value={form.discountValue}
              onChange={(e) =>
                setForm({ ...form, discountValue: Number(e.target.value) })
              }
            />
          </Field>
          {(["stock", "alarmLimit"] as const).map((key) => (
            <Field
              key={key}
              label={
                key === "stock" ? "Stock quantity" : "Low-stock alarm limit"
              }
            >
              <input
                type="number"
                required
                min={0}
                max={1000000}
                step={1}
                value={form[key]}
                onChange={(e) =>
                  setForm({ ...form, [key]: Number(e.target.value) })
                }
              />
            </Field>
          ))}
        </div>
        <div className="modal-footer">
          <Button
            type="button"
            variant="secondary"
            disabled={save.isPending}
            onClick={close}
          >
            Cancel
          </Button>
          <Button disabled={save.isPending}>
            {save.isPending
              ? "Saving…"
              : product
                ? "Save changes"
                : "Add medicine"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const lowStock = params.get("lowStock") === "true";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const query = useQuery({
    queryKey: ["products", debounced, page, lowStock],
    queryFn: () =>
      api<Page<Product>>(
        `/products${queryString({ search: debounced, page, lowStock: String(lowStock) })}`,
      ),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader
        eyebrow="YOUR MEDICINE CABINET"
        title="Inventory"
        description="Every medicine, price, and quantity. Neatly in order."
      >
        <Button onClick={() => setEditing(null)}>
          <Plus size={17} /> Add medicine
        </Button>
      </PageHeader>
      <section className="panel">
        <div className="list-toolbar">
          <div className="tabs">
            <button
              className={!lowStock ? "selected" : ""}
              onClick={() => {
                setPage(1);
                setParams({});
              }}
            >
              All medicines
            </button>
            <button
              className={lowStock ? "selected" : ""}
              onClick={() => {
                setPage(1);
                setParams({ lowStock: "true" });
              }}
            >
              <TriangleAlert size={15} />
              Low stock
            </button>
          </div>
          <SearchBox
            placeholder="Search medicines…"
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : (
          <>
            {query.data.data.length ? (
              <div
                className={`table-scroll ${query.isPlaceholderData ? "opacity-60" : ""}`}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Type</th>
                      <th>Purchase price</th>
                      <th>Sale price</th>
                      <th>Discount / unit</th>
                      <th>Stock</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.data.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div className="cell-with-icon">
                            <span className="medicine-icon">
                              <Pill size={18} />
                            </span>
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.strength || "—"}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="soft-tag">{p.type}</span>
                        </td>
                        <td>{money(p.purchasePriceCents)}</td>
                        <td className="font-semibold">
                          {money(p.salePriceCents)}
                        </td>
                        <td>
                          {p.discountType === "percent"
                            ? `${p.discountValue}%`
                            : money(p.discountValue * 100)}
                        </td>
                        <td>
                          <span
                            className={`stock-chip ${p.stock <= p.alarmLimit ? "low" : ""}`}
                          >
                            <i />
                            {p.stock} units
                          </span>
                          <small className="block text-muted mt-1">
                            Alarm at {p.alarmLimit}
                          </small>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => setEditing(p)}
                          >
                            <Pencil size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title={
                  search
                    ? "No medicines found"
                    : lowStock
                      ? "Your stock is looking good"
                      : "Make room for your first medicine"
                }
                text={
                  search
                    ? "Try a different medicine name."
                    : lowStock
                      ? "Medicines at or below their alarm limit will appear here."
                      : "Add your medicines to start tracking stock and creating bills."
                }
              />
            )}
            <Pagination
              page={page}
              pages={query.data.pages}
              total={query.data.total}
              setPage={setPage}
            />
          </>
        )}
      </section>
      {editing !== undefined && (
        <ProductForm product={editing} close={() => setEditing(undefined)} />
      )}
    </>
  );
}
