import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileChartColumn } from "lucide-react";
import { toast } from "sonner";
import { api, downloadReport, queryString } from "../lib/api";
import { money } from "../lib/format";
import type { BusinessReport, ReportMetrics } from "../lib/types";
import { Button, ErrorState, Field, Loading, PageHeader } from "../components/ui";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
const monthStart = () => `${today().slice(0, 7)}-01`;

function Metrics({ title, subtitle, data, lifetime }: { title: string; subtitle: string; data: ReportMetrics; lifetime?: boolean }) {
  const rows = [
    ["Stock sold", `${data.packsSold.toLocaleString()} packs · ${data.unitsSold.toLocaleString()} units`],
    ["Sales", money(data.salesCents)],
    ["Stock spent", money(data.stockSpentCents)],
    ...(lifetime ? [["Stock left", money(data.stockLeftCents ?? 0)]] : []),
    ["Sales profit", `${data.profitEstimated ? "~ " : ""}${money(data.profitCents)}`],
    ["Expenses", money(data.expenseCents)],
    ["Profit after expenses", `${data.profitEstimated ? "~ " : ""}${money(data.profitAfterExpenseCents)}`],
  ];
  return <section className="panel report-panel"><div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div><div className="report-rows">{rows.map(([label, value]) => <div className="summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{data.profitEstimated && <p className="report-note">~ Includes estimated purchase costs for older invoices.</p>}</section>;
}

export default function Reports() {
  const [dates, setDates] = useState({ from: monthStart(), to: today() });
  const [range, setRange] = useState(dates);
  const [downloading, setDownloading] = useState(false);
  const query = useQuery({ queryKey: ["report", range], queryFn: () => api<BusinessReport>(`/reports${queryString(range)}`) });
  const download = async () => {
    setDownloading(true);
    try { await downloadReport(range.from, range.to); }
    catch (error) { toast.error((error as Error).message); }
    finally { setDownloading(false); }
  };
  return <>
    <PageHeader eyebrow="KNOW WHERE THE BUSINESS STANDS" title="Business reports" description="Compare any date range with your all-time business performance.">
      <Button variant="secondary" disabled={downloading || query.isPending} onClick={() => void download()}><Download size={17} /> {downloading ? "Preparing…" : "Download PDF"}</Button>
    </PageHeader>
    <section className="panel report-filter"><form onSubmit={(e) => { e.preventDefault(); setRange(dates); }}><Field label="From"><input required type="date" value={dates.from} onChange={(e) => setDates({ ...dates, from: e.target.value })} /></Field><Field label="To"><input required type="date" min={dates.from} value={dates.to} onChange={(e) => setDates({ ...dates, to: e.target.value })} /></Field><Button><FileChartColumn size={17} /> View report</Button></form></section>
    {query.isPending ? <Loading /> : query.error ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : <div className="report-grid"><Metrics title="Selected period" subtitle={`${query.data.from} to ${query.data.to}`} data={query.data.period} /><Metrics title="All time" subtitle="All active invoices and recorded expenses" data={query.data.lifetime} lifetime /></div>}
  </>;
}
