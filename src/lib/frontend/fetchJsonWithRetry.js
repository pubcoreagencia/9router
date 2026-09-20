/**
 * Resilient JSON fetch for the Dashboard.
 *
 * Retries transient network failures with exponential backoff and NEVER
 * replaces previously loaded data with an empty collection as a side effect
 * of a failure. Callers decide how to surface the error (state + Try-again).
 *
 * Contract:
 *   const { ok, status, data, error } = await fetchJsonWithRetry(url, options, maxRetries, delay)
 *   - ok=true  -> data holds the parsed JSON
 *   - ok=false -> error holds a human message; data is null. No throw.
 *
 * This is the single source of truth for "don't turn a transient failure into
 * an empty Dashboard". Pages use it instead of bare fetch().catch(() => {}).
 */
export async function fetchJsonWithRetry(
  url,
  options = {},
  maxRetries = 3,
  delay = 1000,
) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        cache: options.cache ?? "no-store",
      });
      if (!res.ok) {
        // HTTP error – retry too (transient 5xx), but surface the status.
        const text = await res.text().catch(() => "");
        lastError = new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
        // Don't retry on 4xx (permanent) — fail fast.
        if (res.status >= 400 && res.status < 500) {
          return { ok: false, status: res.status, data: null, error: lastError.message };
        }
        if (attempt === maxRetries) break;
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, attempt)),
        );
        continue;
      }
      const data = await res.json();
      return { ok: true, status: res.status, data };
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      // Transient network failure – wait before retry (exponential backoff).
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt)),
      );
    }
  }
  return {
    ok: false,
    status: 0,
    data: null,
    error: lastError?.message || "Request failed after multiple attempts",
  };
}

/** Async helper: await delay (ms). Exported for tests. */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}