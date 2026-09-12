import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, body } from "../lib/api";
import { Button, Field } from "../components/ui";
import type { User } from "../lib/types";
export default function Login({ user }: { user?: User | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  const login = useMutation({
    mutationFn: () =>
      api<User>("/auth/login", body("POST", { email, password })),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    },
  });
  if (user) return <Navigate to="/" replace />;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate();
  };
  return (
    <div className="login-page">
      <div className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <Plus strokeWidth={3} />
          </span>
          <div>
            Zainab Traders<small>MEDICINE MANAGEMENT</small>
          </div>
        </div>
        <div className="login-story-content">
          <span className="story-label">
            <Sparkles size={15} /> YOUR STORE, IN GOOD HANDS
          </span>
          <h1>
            More clarity.
            <br />
            Better care.
          </h1>
          <p>
            A little less paperwork. A lot more peace of mind. Your medicines,
            customers, and billing, all in one place.
          </p>
          <div className="abstract-cross">
            <Plus strokeWidth={1} />
            <span className="floating-label">
              <ShieldCheck size={18} /> Built for your everyday
            </span>
          </div>
        </div>
        <small>Care starts with the details.</small>
      </div>
      <div className="login-form-side">
        <form onSubmit={submit} className="login-form">
          <div className="login-lock">
            <LockKeyhole size={24} />
          </div>
          <div className="eyebrow">WELCOME BACK</div>
          <h2>Let’s get to work.</h2>
          <p>Sign in to manage your medical store.</p>
          <Field label="Email address">
            <input
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <div className="password-input">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {login.error && (
            <p className="form-error" role="alert">
              {login.error.message}
            </p>
          )}
          <Button className="w-full justify-center" disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in to workspace"}
            <ArrowRight size={17} />
          </Button>
          <div className="login-note">
            <ShieldCheck size={16} />
            <span>Your secure session lasts 20 days.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
