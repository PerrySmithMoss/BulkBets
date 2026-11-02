export async function demoRequest<T>(
  action: "start" | "reset" | "settle" | `settle?mode=${string}`,
): Promise<T> {
  const response = await fetch(`/api/v1/demo/${action}`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {
    throw new Error("Unable to connect. Please try again.");
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result)
    throw new Error(result?.error || "Demo unavailable. Please try again.");
  return result.data;
}
