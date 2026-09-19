import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Info,
  PackagePlus,
  Plus,
  ReceiptText,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { api, body, queryString } from "../lib/api";
import { useDebounced, useRefresh } from "../lib/hooks";
import { money, netPrice } from "../lib/format";
import type {
  Customer,
  DiscountType,
  Order,
  OrderItem,
  Page,
  Product,
} from "../lib/types";
import {
  Button,
  Confirm,
  Empty,
  ErrorState,
  Field,
  Loading,
  PageHeader,
  SearchBox,
} from "../components/ui";
type Line = Pick<
  OrderItem,
  | "productId"
  | "name"
  | "strength"
  | "quantity"
  | "quantityPerPacking"
  | "unitPriceCents"
  | "discountType"
  | "discountValue"
>;
export default function OrderEditor() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<Order>(`/orders/${id}`),
    enabled: !!id,
  });
  if (id && query.isPending) return <Loading />;
  if (id && query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  return <Editor key={id ?? "new"} order={id ? query.data : undefined} />;
}
function Editor({ order }: { order?: Order }) {
  const navigate = useNavigate();
  const refresh = useRefresh();
  const [requestId] = useState(() => crypto.randomUUID());
  const [lines, setLines] = useState<Line[]>(order?.items ?? []);
  const selectedProductIds = useMemo(
    () => new Set(lines.map((line) => line.productId)),
    [lines],
  );
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState(order?.customerId ?? "");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [billing, setBilling] = useState({
    name: order?.customerName ?? "",
    address: order?.customerAddress ?? "",
    phone: order?.customerPhone ?? "",
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const customerDebounced = useDebounced(customerSearch);
  const [productSearch, setProductSearch] = useState("");
  const productDebounced = useDebounced(productSearch);
  const [received, setReceived] = useState(
    order ? order.receivedCents / 100 : 0,
  );
  const [confirm, setConfirm] = useState(false);
  const [remarks, setRemarks] = useState(order?.remarks ?? "");
  const customers = useQuery({
    queryKey: ["customers", "picker", customerDebounced],
    queryFn: () =>
      api<Page<Customer>>(
        `/customers${queryString({ search: customerDebounced, limit: 20 })}`,
      ),
    enabled: !order && mode === "existing",
  });
  const customer = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => api<Customer>(`/customers/${customerId}`),
    enabled: !!customerId,
  });
  const billingCustomer = useRef(order?.customerId ?? "");
  useEffect(() => {
    if (
      !order &&
      customer.data &&
      billingCustomer.current !== customer.data._id
    ) {
      billingCustomer.current = customer.data._id;
      setBilling({
        name: customer.data.name,
        address: customer.data.address,
        phone: customer.data.phone,
      });
    }
  }, [customer.data, order]);
  const products = useQuery({
    queryKey: ["products", "picker", productDebounced],
    queryFn: () =>
      api<Page<Product>>(
        `/products${queryString({ search: productDebounced, limit: 12 })}`,
      ),
  });
  const { subtotal, total } = useMemo(
    () => {
      let subtotal = 0;
      let total = 0;
      for (const line of lines) {
        subtotal += line.unitPriceCents * line.quantity;
        total +=
          netPrice(line.unitPriceCents, line.discountType, line.discountValue) *
          line.quantity;
      }
      return { subtotal, total };
    },
    [lines],
  );
  const previous =
    order?.previousPendingCents ??
    (mode === "existing" ? (customer.data?.balanceCents ?? 0) : 0);
  const receivedCents = Math.round(received * 100);
  const save = useMutation({
    mutationFn: () =>
      api<Order>(
        order ? `/orders/${order._id}` : "/orders",
        body(order ? "PUT" : "POST", {
          ...(order
            ? { version: order.version }
            : {
                requestId,
                ...(mode === "existing"
                  ? { customerId }
                  : { customer: newCustomer }),
              }),
          items: lines.map(
            ({ productId, quantity, discountType, discountValue }) => ({
              productId,
              quantity,
              discountType,
              discountValue,
            }),
          ),
          receivedAmount: received,
          ...(order || mode === "existing" ? { billingDetails: billing } : {}),
          remarks,
        }),
      ),
    onSuccess: async (result) => {
      await refresh();
      toast.success(order ? "Order updated" : "Order created");
      navigate(`/orders/${result._id}`);
    },
    onError: (e: Error) => {
      setConfirm(false);
      toast.error(e.message);
    },
  });
  function addProduct(product: Product) {
    if (selectedProductIds.has(product._id)) {
      toast.info(
        "This medicine is already in the bill. Update its quantity below.",
      );
      return;
    }
    if (!product.stock) {
      toast.error("This medicine is out of stock.");
      return;
    }
    setLines([
      ...lines,
      {
        productId: product._id,
        name: product.name,
        strength: product.strength,
        quantity: 1,
        quantityPerPacking: product.quantityPerPacking ?? 1,
        unitPriceCents: product.salePriceCents,
        discountType: product.discountType,
        discountValue: product.discountValue,
      },
    ]);
  }
  function updateLine(index: number, changes: Partial<Line>) {
    setLines(
      lines.map((line, i) => (i === index ? { ...line, ...changes } : line)),
    );
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!order && mode === "existing" && !customerId) {
      toast.error("Select a customer or add a new one.");
      return;
    }
    if (!lines.length) {
      toast.error("Add at least one medicine.");
      return;
    }
    if (
      lines.some(
        (l) =>
          l.quantity < 1 ||
          !Number.isInteger(l.quantity) ||
          l.discountValue < 0 ||
          netPrice(l.unitPriceCents, l.discountType, l.discountValue) < 0 ||
          (l.discountType === "percent" && l.discountValue > 100),
      )
    ) {
      toast.error("Check medicine quantities and discounts.");
      return;
    }
    if (receivedCents < 0 || receivedCents > total) {
      toast.error("Received amount cannot exceed this order’s total.");
      return;
    }
    setConfirm(true);
  }
  return (
    <>
      <Link
        className="back-link"
        to={order ? `/orders/${order._id}` : "/orders"}
      >
        <ArrowLeft size={15} />
        Back to {order ? "order" : "orders"}
      </Link>
      <PageHeader
        eyebrow="GOOD DETAILS. CLEARER BILLS."
        title={order ? "Edit order" : "Create an order"}
        description={
          order
            ? "Update medicines, quantities, discounts, or received payment."
            : "Choose a customer, add medicines, and let us do the math."
        }
      />
      <form onSubmit={submit} className="order-editor">
        <div className="space-y-5">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2 className="flex items-center gap-2">
                  <UserRound size={19} /> Customer details
                </h2>
                <p>Who are we helping today?</p>
              </div>
              {!order && (
                <div className="segmented">
                  <button
                    type="button"
                    className={mode === "existing" ? "selected" : ""}
                    onClick={() => setMode("existing")}
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    className={mode === "new" ? "selected" : ""}
                    onClick={() => setMode("new")}
                  >
                    New customer
                  </button>
                </div>
              )}
            </div>
            <div className="panel-body">
              {!order && mode === "existing" && (
                <div className="space-y-3 mb-4">
                  <SearchBox
                    placeholder="Find customer by name or phone…"
                    value={customerSearch}
                    onChange={setCustomerSearch}
                  />
                  {customers.isPending ? (
                    <Loading />
                  ) : customers.error ? (
                    <ErrorState
                      error={customers.error}
                      retry={() => void customers.refetch()}
                    />
                  ) : (
                    <Field label="Select customer">
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                      >
                        <option value="">Choose a customer</option>
                        {customer.data &&
                          !customers.data.data.some(
                            (c) => c._id === customerId,
                          ) && (
                            <option value={customerId}>
                              {customer.data.name}
                            </option>
                          )}
                        {customers.data.data.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                            {c.phone ? ` · ${c.phone}` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {customers.data?.total === 0 && (
                    <p className="inline-note">
                      No customers found.{" "}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setMode("new")}
                      >
                        Add their details
                      </button>
                    </p>
                  )}
                </div>
              )}
              {mode === "new" && !order ? (
                <div className="form-grid">
                  <Field label="Customer name">
                    <input
                      required
                      maxLength={150}
                      placeholder="Full name"
                      value={newCustomer.name}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      maxLength={30}
                      placeholder="03XX XXXXXXX"
                      value={newCustomer.phone}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          phone: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="col-span-full">
                    <Field label="Address">
                      <textarea
                        rows={2}
                        maxLength={500}
                        placeholder="Street, area, city"
                        value={newCustomer.address}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            address: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              ) : order || customer.data ? (
                <div className="customer-preview">
                  <span className="avatar light">
                    <UserRound size={19} />
                  </span>
                  <div>
                    <strong>
                      {order?.customerName ?? customer.data?.name}
                    </strong>
                    <p>
                      {order?.customerAddress ??
                        customer.data?.address ??
                        "No address added"}
                    </p>
                    <small>
                      {order?.customerPhone ?? customer.data?.phone}
                    </small>
                  </div>
                  <div className="customer-balance">
                    <span>
                      {order
                        ? "Previous pending at creation"
                        : "Previous pending"}
                    </span>
                    <strong>{money(previous)}</strong>
                  </div>
                </div>
              ) : customer.isFetching ? (
                <Loading />
              ) : null}
              {customer.error && (
                <p role="alert" className="form-error">
                  {customer.error.message}
                </p>
              )}
              <div className="mt-4">
                <Field label="Bill remarks">
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Optional notes to print on the bill"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </Field>
              </div>
              {(order || (mode === "existing" && customer.data)) && (
                <div className="form-grid mt-4">
                  <Field label="Billing name">
                    <input
                      required
                      maxLength={150}
                      value={billing.name}
                      onChange={(e) =>
                        setBilling({ ...billing, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Billing phone">
                    <input
                      maxLength={30}
                      value={billing.phone}
                      onChange={(e) =>
                        setBilling({ ...billing, phone: e.target.value })
                      }
                    />
                  </Field>
                  <div className="col-span-full">
                    <Field
                      label="Billing address"
                      hint="These details are saved on this bill. Edit the customer profile from Customers."
                    >
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={billing.address}
                        onChange={(e) =>
                          setBilling({ ...billing, address: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2 className="flex items-center gap-2">
                  <PackagePlus size={19} /> Add medicines
                </h2>
                <p>Search your inventory and choose what goes in the bill</p>
              </div>
            </div>
            <div className="panel-body">
              <SearchBox
                placeholder="Search medicines to add…"
                value={productSearch}
                onChange={setProductSearch}
              />
              <div className="product-picker">
                {products.isPending ? (
                  <Loading />
                ) : products.error ? (
                  <ErrorState
                    error={products.error}
                    retry={() => void products.refetch()}
                  />
                ) : products.data.data.length ? (
                  products.data.data.map((p) => {
                    const added = selectedProductIds.has(p._id);
                    return (
                      <button
                        type="button"
                        key={p._id}
                        className={`picker-item ${added ? "added" : ""}`}
                        disabled={
                          added ||
                          p.stock < (p.quantityPerPacking ?? 1)
                        }
                        onClick={() => addProduct(p)}
                      >
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {p.strength} · {Math.floor(p.stock / (p.quantityPerPacking ?? 1))} packs available
                          </small>
                        </div>
                        <span>
                          {money(p.salePriceCents)} / pack
                          {added ? <Check size={17} /> : <Plus size={17} />}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <Empty
                    title="No medicines found"
                    text="Add medicines in Inventory or try another search."
                  />
                )}
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  Order items{" "}
                  <span className="count-tag ml-2">{lines.length}</span>
                </h2>
                <p>
                  Discounts apply to each pack, before multiplying by pack quantity.
                </p>
              </div>
            </div>
            {lines.length ? (
              <div className="order-lines">
                {lines.map((line, index) => (
                  <div className="order-line" key={line.productId}>
                    <div className="line-title">
                      <span className="line-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <strong>{line.name}</strong>
                        <small>
                          {line.strength} · {money(line.unitPriceCents)} / pack · {line.quantityPerPacking} units per pack
                        </small>
                      </div>
                      <button
                        type="button"
                        className="icon-button text-red-600 ml-auto"
                        aria-label={`Remove ${line.name}`}
                        onClick={() =>
                          setLines(lines.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="line-fields">
                      <Field label="Number of packs">
                        <input
                          type="number"
                          required
                          min={1}
                          max={1000000}
                          step={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(index, {
                              quantity: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field label="Discount type">
                        <select
                          value={line.discountType}
                          onChange={(e) =>
                            updateLine(index, {
                              discountType: e.target.value as DiscountType,
                              discountValue: 0,
                            })
                          }
                        >
                          <option value="percent">Percentage (%)</option>
                          <option value="fixed">Fixed (PKR)</option>
                        </select>
                      </Field>
                      <Field
                        label={
                          line.discountType === "percent"
                            ? "Discount (%)"
                            : "Discount / pack"
                        }
                      >
                        <input
                          type="number"
                          required
                          min={0}
                          step="0.01"
                          max={
                            line.discountType === "percent"
                              ? 100
                              : line.unitPriceCents / 100
                          }
                          value={line.discountValue}
                          onChange={(e) =>
                            updateLine(index, {
                              discountValue: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <div className="line-total">
                        <small>Line total</small>
                        <strong>
                          {money(
                            netPrice(
                              line.unitPriceCents,
                              line.discountType,
                              line.discountValue,
                            ) * line.quantity,
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="A fresh bill, ready to fill"
                text="Select medicines above to add your first item."
              />
            )}
          </section>
        </div>
        <aside className="bill-summary panel">
          <div className="panel-heading">
            <h2 className="flex items-center gap-2">
              <ReceiptText size={19} /> Bill summary
            </h2>
          </div>
          <div className="panel-body">
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="summary-row">
              <span>Discount</span>
              <strong className="text-emerald-700">
                − {money(subtotal - total)}
              </strong>
            </div>
            <div className="summary-row current">
              <span>Current order</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summary-row">
              <span>Previous pending</span>
              <strong>{money(previous)}</strong>
            </div>
            <div className="grand-total">
              <span>Grand total</span>
              <strong>{money(total + previous)}</strong>
            </div>
            <Field label="Received for this order (PKR)">
              <input
                required
                type="number"
                min={0}
                max={Math.max(0, total / 100)}
                step="0.01"
                value={received}
                onChange={(e) => setReceived(Number(e.target.value))}
              />
            </Field>
            <button
              className="text-link text-xs mt-2"
              type="button"
              onClick={() => setReceived(total / 100)}
            >
              Mark this order fully paid
            </button>
            <div className="summary-row mt-5">
              <span>Remaining on this order</span>
              <strong>{money(total - receivedCents)}</strong>
            </div>
            <div className="info-note">
              <Info size={16} />
              <p>
                Payments here apply to this order only. Open an earlier order to
                settle its balance.
              </p>
            </div>
            <Button
              className="w-full justify-center mt-5"
              disabled={
                save.isPending ||
                (!order &&
                  mode === "existing" &&
                  (!customer.data || customer.isFetching))
              }
            >
              <Check size={17} />
              {save.isPending
                ? "Saving…"
                : order
                  ? "Save changes"
                  : "Create order"}
            </Button>
            <Link
              className="btn btn-ghost w-full justify-center mt-2"
              to={order ? `/orders/${order._id}` : "/orders"}
            >
              Cancel
            </Link>
          </div>
        </aside>
      </form>
      {confirm && (
        <Confirm
          title={order ? "Update this order?" : "Create this order?"}
          text={`${money(total)} for ${lines.length} medicine${lines.length === 1 ? "" : "s"}. ${order ? "Stock and customer balances will be adjusted." : "Stock will be deducted and a bill will be created."}`}
          onClose={() => setConfirm(false)}
          onConfirm={() => save.mutate()}
          pending={save.isPending}
        />
      )}
    </>
  );
}
