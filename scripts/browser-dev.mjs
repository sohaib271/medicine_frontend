import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1', port: 5175, strictPort: true } });
await server.listen();
const timer = setInterval(async () => {
  try { await fetch('http://127.0.0.1:3101/api/auth/me', { signal: AbortSignal.timeout(1500) }); }
  catch { clearInterval(timer); await server.close(); process.exit(0); }
}, 1000);
