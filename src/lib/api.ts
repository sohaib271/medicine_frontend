export class ApiError extends Error {
  status: number;
  code?: string;
  productIds?: string[];
  constructor(
    message: string,
    status: number,
    details?: { code?: string; productIds?: string[] },
  ) {
    super(message);
    this.status = status;
    this.code = details?.code;
    this.productIds = details?.productIds;
  }
}

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function apiUrl(path: string) {
  return `${API_URL}/api${path}`;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "medicine-frontend",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => ({ message: "Server unavailable. Please try again." }))) as {
      message?: string | string[];
      code?: string;
      productIds?: string[];
    };
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/me"
    )
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      Array.isArray(body.message)
        ? body.message.join(" ")
        : body.message || "Something went wrong.",
      response.status,
      body,
    );
  }
  return response.json() as Promise<T>;
}
export const body = (method: string, data: unknown): RequestInit => ({
  method,
  body: JSON.stringify(data),
});
export function queryString(
  values: Record<string, string | number | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") query.set(key, String(value));
  return `?${query}`;
}
export async function downloadInvoice(id: string, filename: string) {
  const res = await fetch(apiUrl(`/orders/${id}/pdf`), {
    credentials: "include",
  });
  if (!res.ok)
    throw new Error(
      res.status === 401
        ? "Your session was not accepted by the API. Sign in again and check that cross-site cookies are allowed."
        : `Could not download invoice (HTTP ${res.status}). Please try again.`,
    );
  const url = URL.createObjectURL(await res.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadReport(from: string, to: string) {
  const res = await fetch(
    apiUrl(`/reports/pdf?${new URLSearchParams({ from, to })}`),
    {
      credentials: "include",
    },
  );
  if (!res.ok)
    throw new Error("Could not download the report. Please try again.");
  const url = URL.createObjectURL(await res.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-${from}-to-${to}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
