import { useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { api, body, queryString } from "../lib/api";
import { money, shortDate } from "../lib/format";
import type { Expense, ExpensePage } from "../lib/types";
import { useRefresh } from "../lib/hooks";
import { Button, Confirm, Empty, ErrorState, Field, Loading, Modal, PageHeader, Pagination } from "../components/ui";

const localDate = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

function ExpenseForm({ close }: { close: () => void }) {
  const refresh = useRefresh();
  const [form, setForm] = useState({ date: localDate(), category: "", description: "", amount: 0 });
  const save = useMutation({
    mutationFn: () => api<Expense>("/expenses", body("POST", {
      date: form.date,
      category: form.category,
      description: form.description,
      amountCents: Math.round(form.amount * 100),
    })),
    onSuccess: async () => { await refresh(); toast.success("Expense added"); close(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };
  return (
    <Modal title="Add daily expense" subtitle="Record operating costs on the day they occurred." onClose={close}>
      <form onSubmit={submit}>
        <div className="modal-body form-grid">
          <Field label="Date"><input autoFocus required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Category"><input required maxLength={80} placeholder="e.g. Rent, electricity, delivery" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Amount (PKR)"><input required type="number" min="0.01" max="1000000000" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
          <Field label="Description"><textarea rows={3} maxLength={300} placeholder="Optional details" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={save.isPending} onClick={close}>Cancel</Button>
          <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Add expense"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Expenses() {
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const refresh = useRefresh();
  const query = useQuery({
    queryKey: ["expenses", page],
    queryFn: () => api<ExpensePage>(`/expenses${queryString({ page, limit: 20 })}`),
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: (expense: Expense) => api(`/expenses/${expense._id}`, body("DELETE", {})),
    onSuccess: async () => { await refresh(); toast.success("Expense removed"); setDeleting(null); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <>
      <PageHeader eyebrow="DAILY COSTS, CLEARLY TRACKED" title="Expenses" description="Record everyday business expenses and keep profitability accurate.">
        <Button onClick={() => setAdding(true)}><Plus size={17} /> Add expense</Button>
      </PageHeader>
      {query.isPending ? <Loading /> : query.error ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : (
        <>
          <div className="analytics-grid mb-6">
            <div className="stat-card"><div className="stat-top"><span>Total recorded expenses</span><span className="stat-icon orange"><WalletCards size={19} /></span></div><strong>{money(query.data.amountCents)}</strong><small>{query.data.total.toLocaleString()} entries</small></div>
          </div>
          <section className="panel">
            <div className="panel-heading"><div><h2>Expense ledger</h2><p>Newest expenses appear first</p></div></div>
            {query.data.data.length ? <div className="table-scroll"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th /></tr></thead><tbody>
              {query.data.data.map((expense) => <tr key={expense._id}><td>{shortDate(expense.date)}</td><td><span className="soft-tag">{expense.category}</span></td><td className="address-cell">{expense.description || "—"}</td><td className="font-semibold">{money(expense.amountCents)}</td><td><button className="icon-button text-red-600" aria-label={`Delete ${expense.category} expense`} onClick={() => setDeleting(expense)}><Trash2 size={16} /></button></td></tr>)}
            </tbody></table></div> : <Empty title="No expenses recorded" text="Add your first daily expense to include it in profit and reports." />}
            <Pagination page={page} pages={query.data.pages} total={query.data.total} setPage={setPage} />
          </section>
        </>
      )}
      {adding && <ExpenseForm close={() => setAdding(false)} />}
      {deleting && <Confirm danger title="Delete this expense?" text={`${deleting.category} · ${money(deleting.amountCents)} will be removed from reports.`} onClose={() => setDeleting(null)} onConfirm={() => remove.mutate(deleting)} pending={remove.isPending} />}
    </>
  );
}
