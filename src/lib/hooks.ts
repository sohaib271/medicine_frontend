import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
export function useRefresh() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ["products", "customers", "orders", "order", "customer", "dashboard"].map(
        (key) => client.invalidateQueries({ queryKey: [key] }),
      ),
    );
}
