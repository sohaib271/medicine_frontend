import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, body } from "../../lib/api";
import { money } from "../../lib/format";
import { useRefresh } from "../../lib/hooks";
import type { CustomerPayment } from "../../lib/types";
import { Button, Field, Modal } from "../../components/ui";

export function PendingPaymentModal({
  customerId,
  customerName,
  balanceCents,
  close,
}: {
  customerId: string;
  customerName: string;
  balanceCents: number;
  close: () => void;
}) {
  const refresh = useRefresh();
  const [requestId] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState(0);
  const save = useMutation({
    mutationFn: () =>
      api<CustomerPayment>(
        `/customers/${customerId}/pending-payment`,
        body("POST", { requestId, amount }),
      ),
    onSuccess: async (payment) => {
      await refresh();
      toast.success(
        `${money(payment.amountCents)} applied across ${payment.allocations.length} order${payment.allocations.length === 1 ? "" : "s"}`,
      );
      close();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <Modal
      title="Receive pending payment"
      subtitle={`Apply one payment to ${customerName}’s newest outstanding orders first.`}
      onClose={() => { if (!save.isPending) close(); }}
    >
      <form onSubmit={submit}>
        <div className="modal-body space-y-4">
          <div className="summary-row current">
            <span>Total outstanding</span>
            <strong>{money(balanceCents)}</strong>
          </div>
          <Field
            label="Payment received (PKR)"
            hint="The payment is allocated newest order first and recorded in the audit history."
          >
            <input
              autoFocus
              required
              type="number"
              min="0.01"
              max={balanceCents / 100}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </Field>
          <button
            type="button"
            className="text-link"
            onClick={() => setAmount(balanceCents / 100)}
          >
            Settle the full balance
          </button>
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={save.isPending} onClick={close}>Cancel</Button>
          <Button disabled={save.isPending || amount <= 0 || amount * 100 > balanceCents}>
            {save.isPending ? "Applying…" : "Apply payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
