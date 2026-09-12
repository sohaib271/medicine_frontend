import { lazy, Suspense, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, ApiError } from "./lib/api";
import type { User } from "./lib/types";
import { Layout } from "./components/Layout";
import { ErrorState, Loading } from "./components/ui";
import Login from "./pages/Login";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Customers = lazy(() => import("./pages/Customers"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderEditor = lazy(() => import("./pages/OrderEditor"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
export default function App() {
  const client = useQueryClient();
  const auth = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<User>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 60000,
  });
  useEffect(() => {
    const expire = () => {
      client.clear();
      client.setQueryData(["me"], null);
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [client]);
  if (auth.isPending) return <Loading />;
  if (auth.error)
    return <ErrorState error={auth.error} retry={() => void auth.refetch()} />;
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<Login user={auth.data} />} />
        <Route
          element={
            auth.data ? (
              <Layout user={auth.data} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/new" element={<OrderEditor />} />
          <Route path="orders/:id/edit" element={<OrderEditor />} />
          <Route path="orders/:id" element={<OrderDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
