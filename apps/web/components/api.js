const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");
export { API_BASE };

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const txt = await response.text();
    let message = txt || `Request failed: ${response.status}`;
    try {
      const json = JSON.parse(txt);
      if (json?.message) message = json.message;
    } catch {
      // Keep raw text when response is not JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}
