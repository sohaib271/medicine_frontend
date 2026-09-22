import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  Package,
  Plus,
  ReceiptText,
  TriangleAlert,
  Users,
} from "lucide-react";
import { api } from "../lib/api";
import type { Dashboard as DashboardData } from "../lib/types";
import { money, shortDate } from "../lib/format";
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
} from "../components/ui";
export default function Dashboard() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/dashboard"),
  });
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const data = query.data;
  const bars = Array.from({ length: 30 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - 29 + i);
    const key = day.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    return {
      key,
      label: shortDate(day.toISOString()),
      total: data.trend.find((d) => d._id === key)?.total ?? 0,
    };
  });
  const peak = Math.max(...bars.map((b) => b.total), 1);
  return (
    <>
      <PageHeader
        eyebrow="A LITTLE PERSPECTIVE"
        title="Your store at a glance"
        description="A clear view of your inventory, sales, and what needs attention."
      >
        <Link to="/orders/new" className="btn btn-primary">
          <Plus size={17} /> Create order
        </Link>
        <Link to="/challans?new=true" className="btn btn-secondary">
          <Plus size={17} /> Create delivery challan
        </Link>
        <Link to="/challans" className="btn btn-secondary">
          View challans
        </Link>
      </PageHeader>
      <div className="welcome-banner">
        <div>
          <span className="eyebrow">EVERY DETAIL COUNTS</span>
          <h2>
            Good care starts with
            <br className="hidden sm:block" /> a well-managed store.
          </h2>
          <p>Let’s keep things running smoothly today.</p>
        </div>
        <div className="banner-graphic" aria-hidden="true">
          <div className="graphic-circle">
            <Plus size={70} strokeWidth={1.4} />
          </div>
          <div className="graphic-pill" />
          <span>INVENTORY. SIMPLIFIED.</span>
        </div>
      </div>
      <section className="inventory-analytics" aria-labelledby="inventory-analytics-title">
        <div className="analytics-heading">
          <div>
            <h2 id="inventory-analytics-title">Inventory performance</h2>
            <p>Lifetime figures from active invoices</p>
          </div>
          <Link to="/inventory" className="text-link">
            View product details <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="analytics-grid">
          <div className="stat-card">
            <div className="stat-top"><span>Cost of current stock</span><span className="stat-icon blue"><Package size={19} /></span></div>
            <strong>{money(data.stockCostCents)}</strong>
            <small>Purchase value of inventory on hand</small>
          </div>
          <div className="stat-card">
            <div className="stat-top"><span>Sold so far</span><span className="stat-icon green"><CircleDollarSign size={19} /></span></div>
            <strong>{money(data.lifetimeSalesCents)}</strong>
            <small>{data.soldPacks.toLocaleString()} packs · {data.soldUnits.toLocaleString()} units</small>
          </div>
          <div className="stat-card">
            <div className="stat-top"><span>Amount received · all time</span><span className="stat-icon blue"><ReceiptText size={19} /></span></div>
            <strong>{money(data.lifetimeReceivedCents)}</strong>
            <small>Payments collected on active invoices</small>
          </div>
          <div className="stat-card">
            <div className="stat-top"><span>Sales profit · all time</span><span className="stat-icon purple"><ArrowUpRight size={19} /></span></div>
            <strong>{data.profitEstimated ? "~ " : ""}{money(data.netProfitCents)}</strong>
            <small>This month: {money(data.monthlyProfitCents)}</small>
          </div>
          <div className="stat-card">
            <div className="stat-top"><span>Expenses · all time</span><span className="stat-icon orange"><ReceiptText size={19} /></span></div>
            <strong>{money(data.expenseCents)}</strong>
            <small>This month: {money(data.monthlyExpenseCents)}</small>
          </div>
          <div className="stat-card">
            <div className="stat-top"><span>Profit after expenses</span><span className="stat-icon green"><CircleDollarSign size={19} /></span></div>
            <strong>{data.profitEstimated ? "~ " : ""}{money(data.profitAfterExpenseCents)}</strong>
            <small>This month: {money(data.monthlyProfitAfterExpenseCents)}</small>
          </div>
        </div>
      </section>
      <div className="stats-grid">
        {[
          {
            label: "Sales · last 30 days",
            value: money(data.salesCents),
            detail: `${data.orderCount} orders created`,
            icon: CircleDollarSign,
            tone: "green",
          },
          {
            label: "Medicines in catalog",
            value: data.productCount.toLocaleString(),
            detail: `${data.lowStockCount} need restocking`,
            icon: Package,
            tone: "blue",
          },
          {
            label: "Customer outstanding",
            value: money(data.balanceCents),
            detail: "Across all unpaid orders",
            icon: ReceiptText,
            tone: "orange",
          },
          {
            label: "Your customers",
            value: data.customerCount.toLocaleString(),
            detail: "Care that keeps growing",
            icon: Users,
            tone: "purple",
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon size={19} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Sales overview</h2>
              <p>A day-by-day look at the last 30 days</p>
            </div>
            <span className="soft-tag">Last 30 days</span>
          </div>
          <div className="chart-summary">
            <strong>{money(data.salesCents)}</strong>
            <span>total sales</span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={`Sales for the last 30 days: ${money(data.salesCents)}`}
          >
            <div className="chart-grid" />
            {bars.map((b) => (
              <div
                className="chart-column"
                key={b.key}
                title={`${b.label}: ${money(b.total)}`}
              >
                <div
                  style={{ height: `${Math.max((b.total / peak) * 100, 2)}%` }}
                  className={b.total ? "has-sales" : ""}
                />
              </div>
            ))}
          </div>
          <div className="chart-labels">
            <span>{bars[0].label}</span>
            <span>{bars[14].label}</span>
            <span>{bars[29].label}</span>
          </div>
          {!data.salesCents && (
            <p className="chart-empty">
              Your sales will appear here as you create orders.
            </p>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2 className="flex items-center gap-2">
                <TriangleAlert size={18} className="text-amber-600" /> Stock
                watch
              </h2>
              <p>A little attention goes a long way</p>
            </div>
            <span className="count-tag">{data.lowStockCount}</span>
          </div>
          {data.lowStock.length ? (
            <div className="stock-list">
              {data.lowStock.map((p) => (
                <Link
                  to="/inventory?lowStock=true"
                  key={p._id}
                  className="stock-item"
                >
                  <span className="medicine-icon">
                    <Package size={19} />
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.type} {p.strength && `· ${p.strength}`}
                    </small>
                  </div>
                  <span className="stock-level">
                    {p.stock} left
                    <small>
                      Min. {p.alarmLimit} {p.alarmType === "packing" ? "packs" : "units"}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Stock looks healthy"
              text="Medicines at their alarm limit will appear here."
            />
          )}
          <Link className="panel-link" to="/inventory?lowStock=true">
            Review low stock <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recent orders</h2>
            <p>Your latest activity, all in one place</p>
          </div>
          <Link to="/orders" className="text-link">
            View all orders <ArrowUpRight size={16} />
          </Link>
        </div>
        {data.recentOrders.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <Link className="table-primary" to={`/orders/${o._id}`}>
                        {o.invoiceNumber}
                      </Link>
                    </td>
                    <td>{o.customerName}</td>
                    <td className="text-muted">{shortDate(o.createdAt)}</td>
                    <td className="font-semibold">{money(o.totalCents)}</td>
                    <td>
                      <Badge status={o.status} />
                    </td>
                    <td>
                      <Link
                        aria-label={`View ${o.invoiceNumber}`}
                        className="icon-button"
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
            title="Your first order starts here"
            text="Create a bill and we’ll take care of inventory and balances."
          >
            <Link to="/orders/new" className="btn btn-secondary">
              <Plus size={16} />
              Create order
            </Link>
          </Empty>
        )}
      </section>
    </>
  );
}
