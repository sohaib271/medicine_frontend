import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Download,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api, body, downloadInvoice } from "../lib/api";
import { useRefresh } from "../lib/hooks";
import type { Customer, Order } from "../lib/types";
import { dateTime, money } from "../lib/format";
import {
  Badge,
  Button,
  Confirm,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeader,
} from "../components/ui";
export default function OrderDetail() {
  const { id } = useParams();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<Order>(`/orders/${id}`),
  });
  const customer = useQuery({
    queryKey: ["customer", query.data?.customerId],
    queryFn: () => api<Customer>(`/customers/${query.data!.customerId}`),
    enabled: !!query.data,
  });
  const [deleting, setDeleting] = useState(false);
  const [payment, setPayment] = useState(false);
  const [received, setReceived] = useState(0);
  const [confirmPayment, setConfirmPayment] = useState(false);
  const remove = useMutation({
    mutationFn: () =>
      api(`/orders/${id}`, body("DELETE", { version: query.data!.version })),
    onSuccess: async () => {
      await refresh();
      toast.success("Order deleted. Stock and balance restored.");
      navigate("/orders");
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setDeleting(false);
    },
  });
  const pay = useMutation({
    mutationFn: () =>
      api(
        `/orders/${id}/payment`,
        body("PATCH", {
          version: query.data!.version,
          receivedAmount: received,
        }),
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Payment updated");
      setPayment(false);
      setConfirmPayment(false);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setConfirmPayment(false);
    },
  });
  const download = useMutation({
    mutationFn: () => downloadInvoice(id!, query.data!.invoiceNumber),
    onError: (e: Error) => toast.error(e.message),
  });
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const order = query.data;
  return (
    <>
      <Link className="back-link" to="/orders">
        <ArrowLeft size={15} />
        Back to orders
      </Link>
      <PageHeader
        eyebrow="THE DETAILS, ALL TOGETHER"
        title="Order details"
        description={order.invoiceNumber}
      >
        <Link className="btn btn-secondary" to={`/orders/${id}/edit`}>
          <Pencil size={16} /> Edit order
        </Link>
        <Button
          variant="secondary"
          disabled={download.isPending}
          onClick={() => download.mutate()}
        >
          <Download size={16} />
          {download.isPending ? "Preparing…" : "Download PDF"}
        </Button>
        <Button
          onClick={() => {
            setReceived(order.receivedCents / 100);
            setPayment(true);
          }}
        >
          <Wallet size={17} /> Update payment
        </Button>
      </PageHeader>
      <div className="detail-grid">
        <section className="panel invoice">
          <div className="invoice-heading">
            <div className="brand text-forest">
              <span className="brand-mark">
                <Plus strokeWidth={3} />
              </span>
              <div>
                Zainab Traders<small>MEDICINE STORE</small>
              </div>
            </div>
            <div className="text-right">
              <div className="eyebrow mb-2">SALES INVOICE</div>
              <Badge status={order.status} />
            </div>
          </div>
          <div className="invoice-meta">
            <div>
              <span className="eyebrow">BILL TO</span>
              <h3>{order.customerName}</h3>
              <p>{order.customerAddress || "No address provided"}</p>
              <p>{order.customerPhone}</p>
            </div>
            <div>
              <span className="eyebrow">INVOICE DETAILS</span>
              <strong>{order.invoiceNumber}</strong>
              <p>Created {dateTime(order.createdAt)}</p>
              <p>Updated {dateTime(order.updatedAt)}</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Company</th>
                  <th>Pieces / pack</th>
                  <th>Packs</th>
                  <th>Price / pack</th>
                  <th>Discount / pack</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.productId}>
                    <td>
                      <strong>{i.name}</strong>
                      <small className="block text-muted mt-1">
                        {i.type} · {i.strength}
                      </small>
                    </td>
                    <td>{i.company || "—"}</td>
                    <td>{i.quantityPerPacking ?? 1}</td>
                    <td>{i.quantity}</td>
                    <td>{money(i.unitPriceCents)}</td>
                    <td>
                      {i.discountType === "percent"
                        ? `${i.discountValue}%`
                        : money(i.discountValue * 100)}
                    </td>
                    <td className="font-semibold">{money(i.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="invoice-bottom">
            <div className="invoice-note">
              <span className="eyebrow">THANK YOU FOR YOUR TRUST</span>
              <p>
                <strong>Remarks:</strong> {order.customerName}
                {order.remarks?.trim() ? ` — ${order.remarks.trim()}` : ""}
              </p>
              <p>
                Previous pending is recorded when the bill is created. This
                order’s status is based only on its own received payment.
              </p>
            </div>
            <div className="invoice-totals">
              {[
                ["Subtotal", order.subtotalCents],
                ["Discount", -order.discountCents],
                ["Current order amount", order.totalCents],
                ["Previous pending at creation", order.previousPendingCents],
              ].map(([label, value]) => (
                <div className="summary-row" key={label}>
                  <span>{label}</span>
                  <strong>{money(Number(value))}</strong>
                </div>
              ))}
              <div className="grand-total">
                <span>Grand total</span>
                <strong>{money(order.grandTotalCents)}</strong>
              </div>
              <div className="summary-row">
                <span>Received for this order</span>
                <strong>{money(order.receivedCents)}</strong>
              </div>
              <div className="summary-row current">
                <span>This order’s remaining</span>
                <strong>{money(order.remainingCents)}</strong>
              </div>
            </div>
          </div>
        </section>
        <aside className="space-y-5">
          <section className="panel">
            <div className="panel-heading">
              <h2 className="flex items-center gap-2">
                <Clock3 size={18} /> Status timeline
              </h2>
            </div>
            <div className="timeline">
              {order.statusHistory.map((event, i) => (
                <div className="timeline-event" key={i}>
                  <span className="timeline-dot" />
                  <Badge status={event.status} />
                  <p>{dateTime(event.at)}</p>
                  <small>Received {money(event.receivedCents)}</small>
                </div>
              ))}
            </div>
            <div className="status-foot">
              Current status since
              <br />
              <strong>{dateTime(order.statusUpdatedAt)}</strong>
            </div>
          </section>
          <section className="balance-card">
            <span className="eyebrow">CUSTOMER ACCOUNT</span>
            <h3>Total outstanding now</h3>
            {customer.data ? (
              <strong>{money(customer.data.balanceCents)}</strong>
            ) : (
              <p>
                {customer.error
                  ? "Could not load customer balance."
                  : "Loading…"}
              </p>
            )}
            <p>Live balance across all orders.</p>
            <Link
              className="text-link"
              to={`/orders?customerId=${order.customerId}`}
            >
              View customer’s orders →
            </Link>
          </section>
          <Button
            className="w-full justify-center"
            variant="ghost"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={16} /> Delete order
          </Button>
        </aside>
      </div>
      {deleting && (
        <Confirm
          title="Delete this order?"
          text="This removes the bill from active orders, restores all medicine quantities, and removes this order’s outstanding amount from the customer’s balance. Any cash refund must be handled separately."
          danger
          onClose={() => setDeleting(false)}
          onConfirm={() => remove.mutate()}
          pending={remove.isPending}
        />
      )}
      {payment && !confirmPayment && (
        <Modal
          title="Update received payment"
          subtitle="Enter the total received to date for this order."
          onClose={() => setPayment(false)}
        >
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setConfirmPayment(true);
            }}
          >
            <div className="modal-body space-y-4">
              <div className="summary-row">
                <span>Order amount</span>
                <strong>{money(order.totalCents)}</strong>
              </div>
              <div className="summary-row">
                <span>Already received</span>
                <strong>{money(order.receivedCents)}</strong>
              </div>
              <Field
                label="Total received to date (PKR)"
                hint="Include earlier payments for this order. Previous orders are paid separately."
              >
                <input
                  autoFocus
                  type="number"
                  required
                  min={0}
                  max={order.totalCents / 100}
                  step="0.01"
                  value={received}
                  onChange={(e) => setReceived(Number(e.target.value))}
                />
              </Field>
              <button
                type="button"
                className="text-link"
                onClick={() => setReceived(order.totalCents / 100)}
              >
                Set to fully paid
              </button>
            </div>
            <div className="modal-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPayment(false)}
              >
                Cancel
              </Button>
              <Button>Review payment</Button>
            </div>
          </form>
        </Modal>
      )}
      {confirmPayment && (
        <Confirm
          title="Confirm payment update?"
          text={`Set total received to ${money(Math.round(received * 100))}. Remaining on this order: ${money(order.totalCents - Math.round(received * 100))}.`}
          onClose={() => setConfirmPayment(false)}
          onConfirm={() => pay.mutate()}
          pending={pay.isPending}
        />
      )}
    </>
  );
}
