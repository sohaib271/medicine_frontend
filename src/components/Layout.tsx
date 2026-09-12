import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  ReceiptText,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api, body } from "../lib/api";
import type { User } from "../lib/types";
const links = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/orders", label: "Orders & billing", icon: ReceiptText },
  { to: "/customers", label: "Customers", icon: Users },
];
export function Layout({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api("/auth/logout", body("POST", {})),
    onSuccess: () => {
      client.clear();
      client.setQueryData(["me"], null);
      navigate("/login");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const section =
    links.find((l) =>
      l.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(l.to),
    )?.label ?? "Orders & billing";
  return (
    <div className="app-shell">
      {open && (
        <button
          className="sidebar-shade"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Plus strokeWidth={3} />
          </span>
          <div>
            Zainab Traders<small>MEDICINE MANAGEMENT</small>
          </div>
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              end={to === "/"}
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="flex items-center gap-2">
            <Activity size={17} /> A healthier workflow
          </span>
          <p>
            Keep your shelves stocked.
            <br />
            Keep your business moving.
          </p>
          <NavLink to="/orders/new">
            Create a new bill <ArrowUpRight size={16} />
          </NavLink>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <small className="capitalize">{user.role}</small>
          </div>
          <button
            title="Sign out"
            aria-label="Sign out"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="menu-toggle icon-button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <strong>{section}</strong>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="admin-chip">
              <ShieldCheck size={14} /> Admin workspace
            </span>
            <span className="today">
              {new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
        <main key={location.pathname} className="page-enter">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Zainab Traders · Made for better care</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} /> Secure workspace
          </span>
        </footer>
      </div>
    </div>
  );
}
