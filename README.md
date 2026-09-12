# Medicine frontend

React + TypeScript, Tailwind CSS, TanStack Query, React Router, Lucide icons, and Sonner notifications.

See the [workspace README](../README.md) for setup, credentials, accounting rules, and production deployment.

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173 with the backend running on port 3000. Session cookies are sent through `/api`; no tokens are stored in local storage.

`src/pages` contains lazy-loaded screens, `src/components` contains the shell and shared controls, and `src/lib` contains typed API access, query helpers, data types, and money formatting. Use `npm.cmd run build`, `npm.cmd test`, and `npm.cmd run test:browser` for validation.
