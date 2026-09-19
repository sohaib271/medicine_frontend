import { useState } from "react";
import { useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Download, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { api, body, queryString } from "../lib/api";
import { dateTime } from "../lib/format";
import { useDebounced } from "../lib/hooks";
import type { Page } from "../lib/types";
import type { Challan } from "../features/challans/types";
import { ChallanForm } from "../features/challans/ChallanForm";
import {
  Button,
  Confirm,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  Pagination,
  SearchBox,
} from "../components/ui";
export default function Challans() {
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Challan | null | undefined>(() =>
    params.get("new") === "true" ? null : undefined,
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Challan | null>(null);
  const debounced = useDebounced(search);
  const query = useQuery({
    queryKey: ["challans", page, status, debounced],
    queryFn: () =>
      api<Page<Challan>>(
        `/challans${queryString({ page, status, search: debounced })}`,
      ),
    placeholderData: keepPreviousData,
  });
  const download = useMutation({
    mutationFn: async (challan: Challan) => {
      const response = await fetch(`/api/challans/${challan._id}/pdf`, {
        credentials: "include",
      });
      if (!response.ok)
        throw new Error(
          "Could not download delivery challan. Please try again.",
        );
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${challan.challanNumber}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (challan: Challan) => api(`/challans/${challan._id}`, body("DELETE", { version: challan.version })),
    onSuccess: async () => { await query.refetch(); toast.success("Delivery challan deleted"); setDeleting(null); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <>
      <PageHeader
        eyebrow="DELIVERY RECORDS"
        title="Delivery challans"
        description="Prepare delivery documents and keep track of pending and completed deliveries."
      >
        <Button onClick={() => setEditing(null)}>
          <Plus size={17} /> Create delivery challan
        </Button>
      </PageHeader>
      <section className="panel">
        <div className="list-toolbar">
          <div className="tabs">
            {["", "pending", "delivered"].map((value) => (
              <button
                key={value}
                className={
                  status === value ? "selected capitalize" : "capitalize"
                }
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                {value || "All challans"}
              </button>
            ))}
          </div>
          <SearchBox
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search challan, product or company…"
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
                      <th>Challan</th>
                      <th>Products</th>
                      <th>Quantity</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.data.map((challan) => (
                      <tr key={challan._id}>
                        <td>
                          <strong>{challan.challanNumber}</strong>
                          <small className="block text-muted mt-1">
                            Updated {dateTime(challan.updatedAt)}
                          </small>
                        </td>
                        <td>
                          <strong>{challan.items[0]?.name}</strong>
                          <small className="block text-muted mt-1">
                            {challan.items.length} product line
                            {challan.items.length === 1 ? "" : "s"}
                          </small>
                        </td>
                        <td>
                          {challan.items.reduce(
                            (sum, item) => sum + item.quantity,
                            0,
                          )}{" "}
                          units
                        </td>
                        <td>{dateTime(challan.createdAt)}</td>
                        <td>
                          <span
                            className={`badge ${challan.status === "delivered" ? "badge-paid" : "badge-pending"}`}
                          >
                            <i />
                            {challan.status}
                          </span>
                          <small className="block text-muted mt-1">
                            {dateTime(challan.statusUpdatedAt)}
                          </small>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="icon-button"
                              aria-label={`Edit ${challan.challanNumber}`}
                              onClick={() => setEditing(challan)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="icon-button"
                              disabled={download.isPending}
                              aria-label={`Download ${challan.challanNumber}`}
                              onClick={() => download.mutate(challan)}
                            >
                              <Download size={16} />
                            </button>
                            <button className="icon-button text-red-600" aria-label={`Delete ${challan.challanNumber}`} onClick={() => setDeleting(challan)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Your deliveries start here"
                text="Create a challan with the products, companies, and quantities to be delivered."
              >
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  <Truck size={16} /> Create delivery challan
                </Button>
              </Empty>
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
        <ChallanForm
          challan={editing}
          close={() => {
            setEditing(undefined);
            setParams({}, { replace: true });
          }}
        />
      )}
      {deleting && <Confirm title="Delete this delivery challan?" text={`${deleting.challanNumber} will be removed from the challan list.`} danger onClose={() => setDeleting(null)} onConfirm={() => remove.mutate(deleting)} pending={remove.isPending} />}
    </>
  );
}
