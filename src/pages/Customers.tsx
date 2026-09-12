import { useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, body, queryString } from "../lib/api";
import { useDebounced, useRefresh } from "../lib/hooks";
import type { Customer, Page } from "../lib/types";
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
function CustomerForm({
  customer,
  close,
}: {
  customer: Customer | null;
  close: () => void;
}) {
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
  });
  const refresh = useRefresh();
  const save = useMutation({
    mutationFn: () =>
      api(
        `/customers${customer ? `/${customer._id}` : ""}`,
        body(customer ? "PUT" : "POST", form),
      ),
    onSuccess: async () => {
      await refresh();
      toast.success("Customer saved");
      close();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Modal
      title={customer ? "Edit customer" : "Add a customer"}
      subtitle="Keep the people behind every order close."
      onClose={() => {
        if (!save.isPending) close();
      }}
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="modal-body space-y-4">
          <Field label="Customer name">
            <input
              autoFocus
              required
              maxLength={150}
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Phone number">
            <input
              type="tel"
              maxLength={30}
              placeholder="03XX XXXXXXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Street, area, city"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
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
            {save.isPending ? "Saving…" : "Save customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const [editing, setEditing] = useState<Customer | null | undefined>(
    undefined,
  );
  const query = useQuery({
    queryKey: ["customers", debounced, page],
    queryFn: () =>
      api<Page<Customer>>(
        `/customers${queryString({ search: debounced, page })}`,
      ),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader
        eyebrow="PEOPLE, NOT JUST ORDERS"
        title="Customers"
        description="Customer details and outstanding balances, always at hand."
      >
        <Button onClick={() => setEditing(null)}>
          <Plus size={17} /> Add customer
        </Button>
      </PageHeader>
      <section className="panel">
        <div className="list-toolbar">
          <h2>Customer directory</h2>
          <SearchBox
            placeholder="Search name or phone…"
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
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Address</th>
                      <th>Outstanding</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.data.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <div className="cell-with-icon">
                            <span className="avatar light">
                              {c.name.slice(0, 2).toUpperCase()}
                            </span>
                            <strong>{c.name}</strong>
                          </div>
                        </td>
                        <td>{c.phone || "—"}</td>
                        <td className="address-cell">{c.address || "—"}</td>
                        <td>
                          <span
                            className={`font-semibold ${c.balanceCents ? "text-amber-700" : "text-emerald-700"}`}
                          >
                            {money(c.balanceCents)}
                          </span>
                          <small className="block text-muted mt-1">
                            {c.balanceCents ? "Payment due" : "All settled"}
                          </small>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              className="icon-button"
                              aria-label={`Edit ${c.name}`}
                              onClick={() => setEditing(c)}
                            >
                              <Pencil size={16} />
                            </button>
                            <Link
                              className="text-link"
                              to={`/orders?customerId=${c._id}`}
                            >
                              Orders <ArrowUpRight size={15} />
                            </Link>
                          </div>
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
                    ? "No matching customers"
                    : "Every customer starts a connection"
                }
                text={
                  search
                    ? "Try a different name or phone number."
                    : "Add a customer here or while creating their first order."
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
        <CustomerForm customer={editing} close={() => setEditing(undefined)} />
      )}
    </>
  );
}
