export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
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
  const res = await fetch(`/api/orders/${id}/pdf`, { credentials: "include" });
  if (!res.ok) throw new Error("Could not download invoice. Please try again.");
  const url = URL.createObjectURL(await res.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
