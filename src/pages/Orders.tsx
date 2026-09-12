import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { api, queryString } from "../lib/api";
import { useDebounced } from "../lib/hooks";
import type { Order, Page } from "../lib/types";
import { money, shortDate } from "../lib/format";
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  Pagination,
  SearchBox,
} from "../components/ui";
export default function Orders() {
  const [params, setParams] = useSearchParams();
  const customerId = params.get("customerId") ?? undefined;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const debounced = useDebounced(search);
  const query = useQuery({
    queryKey: ["orders", debounced, page, status, customerId],
    queryFn: () =>
      api<Page<Order>>(
        `/orders${queryString({ search: debounced, page, status, customerId })}`,
      ),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader
        eyebrow="A RECORD OF EVERY SALE"
        title="Orders & billing"
        description="Create bills, track payments, and keep your books in balance."
      >
        <Link className="btn btn-primary" to="/orders/new">
          <Plus size={17} /> Create order
        </Link>
      </PageHeader>
      {customerId && (
        <button
          className="filter-chip"
          onClick={() => {
            setParams({});
            setPage(1);
          }}
        >
          Showing selected customer’s orders <X size={15} />
        </button>
      )}
      <section className="panel">
        <div className="list-toolbar">
          <div className="tabs">
            {["", "paid", "partial", "pending"].map((s) => (
              <button
                key={s}
                className={status === s ? "selected capitalize" : "capitalize"}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
              >
                {s || "All orders"}
              </button>
            ))}
          </div>
          <SearchBox
            placeholder="Search invoice or customer…"
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
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Created</th>
                      <th>Order amount</th>
                      <th>Remaining</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.data.map((o) => (
                      <tr key={o._id}>
                        <td>
                          <Link
                            className="table-primary"
                            to={`/orders/${o._id}`}
                          >
                            {o.invoiceNumber}
                          </Link>
                        </td>
                        <td>{o.customerName}</td>
                        <td className="text-muted">{shortDate(o.createdAt)}</td>
                        <td className="font-semibold">{money(o.totalCents)}</td>
                        <td>{money(o.remainingCents)}</td>
                        <td>
                          <Badge status={o.status} />
                        </td>
                        <td>
                          <Link
                            className="icon-button"
                            aria-label={`View ${o.invoiceNumber}`}
                            to={`/orders/${o._id}`}
                          >
                            <ArrowUpRight size={17} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title={
                  search || status
                    ? "No orders match this view"
                    : "Your next sale starts here"
                }
                text="Create an order to generate a bill and update your inventory."
              >
                <Link className="btn btn-secondary" to="/orders/new">
                  <Plus size={16} /> Create order
                </Link>
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
    </>
  );
}
