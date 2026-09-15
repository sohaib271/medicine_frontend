import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, body, queryString } from "../../lib/api";
import type { Customer, Page } from "../../lib/types";
import { useDebounced } from "../../lib/hooks";
import { medicineTypes } from "../../lib/types";
import { Button, Field, Modal } from "../../components/ui";
import type { Challan, ChallanItem } from "./types";
const emptyItem = (): ChallanItem => ({
  name: "",
  strength: "",
  type: "Tablet",
  quantity: 1,
  company: "",
});
export function ChallanForm({
  challan,
  close,
}: {
  challan: Challan | null;
  close: () => void;
}) {
  const [items, setItems] = useState<ChallanItem[]>(
    challan?.items ?? [emptyItem()],
  );
  const [status, setStatus] = useState<Challan["status"]>(
    challan?.status ?? "pending",
  );
  const [requestId] = useState(() => crypto.randomUUID());
  const client = useQueryClient();
  const [customerId, setCustomerId] = useState(challan?.customerId ?? "");
  const [mode, setMode] = useState("existing");
  const [name, setName] = useState(challan?.customerName ?? "");
  const [address, setAddress] = useState(challan?.customerAddress ?? "");
  const [phone, setPhone] = useState(challan?.customerPhone ?? "");
  const [remarks, setRemarks] = useState(challan?.remarks ?? "");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const customers = useQuery({
    queryKey: ["customers", "challan-picker", debounced],
    queryFn: () =>
      api<Page<Customer>>(
        `/customers${queryString({ search: debounced, limit: 100 })}`,
      ),
  });
  const save = useMutation({
    mutationFn: async () => {
      let selectedId = customerId;
      if (mode === "new") {
        const created = await api<Customer>(
          "/customers",
          body("POST", { name, address, phone }),
        );
        selectedId = created._id;
        setCustomerId(selectedId);
        setMode("existing");
        await client.invalidateQueries({ queryKey: ["customers"] });
      }
      return api<Challan>(
        challan ? `/challans/${challan._id}` : "/challans",
        body(challan ? "PUT" : "POST", {
          items,
          status,
          customerId: selectedId,
          customerAddress: address,
          remarks,
          ...(challan ? { version: challan.version } : { requestId }),
        }),
      );
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["challans"] });
      toast.success(
        challan ? "Delivery challan updated" : "Delivery challan created",
      );
      close();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = (index: number, changes: Partial<ChallanItem>) =>
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <Modal
      title={challan ? "Edit delivery challan" : "Create delivery challan"}
      subtitle="Record the products being delivered."
      onClose={() => {
        if (!save.isPending) close();
      }}
    >
      <form onSubmit={submit}>
        <div className="modal-body space-y-5">
          <div className="tabs">
            <button
              type="button"
              className={mode === "existing" ? "selected" : ""}
              onClick={() => setMode("existing")}
            >
              Existing customer
            </button>
            <button
              type="button"
              className={mode === "new" ? "selected" : ""}
              onClick={() => {
                setMode("new");
                setCustomerId("");
                setName("");
                setAddress("");
                setPhone("");
              }}
            >
              New customer
            </button>
          </div>
          {mode === "existing" ? (
            <>
              <Field label="Search customers">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or phone"
                />
              </Field>
              <Field label="Select customer">
                <select
                  required
                  value={customerId}
                  onChange={(e) => {
                    const selected = customers.data?.data.find(
                      (c) => c._id === e.target.value,
                    );
                    setCustomerId(e.target.value);
                    if (selected) {
                      setName(selected.name);
                      setAddress(selected.address);
                      setPhone(selected.phone);
                    }
                  }}
                >
                  <option value="">Choose a customer</option>
                  {customerId &&
                    !customers.data?.data.some((c) => c._id === customerId) && (
                      <option value={customerId}>{name}</option>
                    )}
                  {customers.data?.data.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {customers.isPending && <p>Loading customers…</p>}
              {customers.error && (
                <p role="alert" className="form-error">
                  {customers.error.message}
                </p>
              )}
              {customers.data?.total === 0 && (
                <p>No customers found. Use New customer to add one.</p>
              )}
            </>
          ) : (
            <div className="form-grid">
              <Field label="Customer name">
                <input
                  required
                  maxLength={150}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <input
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            </div>
          )}
          <div className="form-grid">
            <Field label="Area / address">
              <textarea
                maxLength={500}
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
            <Field label="Remarks">
              <textarea
                maxLength={500}
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Delivery status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Challan["status"])}
            >
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
            </select>
          </Field>
          {items.map((item, i) => (
            <fieldset
              key={i}
              className="rounded-lg border border-stone-200 p-4"
            >
              <legend className="px-2 text-xs font-semibold">
                Product {i + 1}
              </legend>
              <div className="form-grid">
                <Field label="Product name">
                  <input
                    required
                    maxLength={150}
                    value={item.name}
                    placeholder="Medicine name"
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </Field>
                <Field label="Company name">
                  <input
                    required
                    maxLength={100}
                    value={item.company}
                    placeholder="Manufacturer / company"
                    onChange={(e) => update(i, { company: e.target.value })}
                  />
                </Field>
                <Field label="Type">
                  <select
                    value={item.type}
                    onChange={(e) => update(i, { type: e.target.value })}
                  >
                    {medicineTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Strength (mg)">
                  <input
                    maxLength={50}
                    value={item.strength ?? ""}
                    placeholder="e.g. 250 mg, 500 mg"
                    onChange={(e) => update(i, { strength: e.target.value })}
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    required
                    type="number"
                    min={1}
                    max={1000000}
                    step={1}
                    value={item.quantity}
                    onChange={(e) =>
                      update(i, { quantity: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="mt-2"
                disabled={items.length === 1 || save.isPending}
                onClick={() =>
                  setItems(items.filter((_, index) => index !== i))
                }
              >
                <Trash2 size={14} /> Remove product {i + 1}
              </Button>
            </fieldset>
          ))}
          <Button
            type="button"
            variant="secondary"
            disabled={items.length >= 100 || save.isPending}
            onClick={() => setItems([...items, emptyItem()])}
          >
            <Plus size={16} /> Add product
          </Button>
          {save.error && (
            <p className="form-error" role="alert">
              {save.error.message}
            </p>
          )}
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
            {save.isPending ? "Saving…" : "Save challan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
