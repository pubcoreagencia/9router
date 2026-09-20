import { describe, it, expect, vi, beforeEach } from 'vitest';

// Standalone retry utility (copied from the component logic for pure testing)
async function fetchWithRetry(
  setLoading,
  setError,
  setConnections,
  setProviderNodes,
  maxRetries = 3,
  delay = 1000
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      setLoading(true);
      setError(null);
      const [connectionsRes, nodesRes] = await Promise.all([
        fetch("/api/providers"),
        fetch("/api/provider-nodes"),
      ]);
      const connectionsData = await connectionsRes.json();
      const nodesData = await nodesRes.json();
      if (connectionsRes.ok) {
        setConnections(connectionsData.connections || []);
      }
      if (nodesRes.ok) {
        setProviderNodes(nodesData.nodes || []);
      }
      // Success - exit retry loop
      return { success: true, attempt: attempt };
    } catch (err) {
      console.error(`Attempt ${attempt + 1} failed:`, err);
      if (attempt === maxRetries) {
        // All retries exhausted
        setError("Failed to load providers after multiple attempts");
        return { success: false, error: "Failed to load providers after multiple attempts", attempts: attempt + 1 };
      } else {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    } finally {
      setLoading(false);
    }
  }
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

describe('fetchWithRetry (standalone)', () => {
  it('success on first attempt', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connections: [{ provider: 'nvidia', connected: true }], nodes: [] })
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ nodes: [] }) });

    const state = { connections: [], providerNodes: [], loading: true, error: null };
    const setLoading = (val) => { state.loading = val; };
    const setError = (val) => { state.error = val; };
    const setConnections = (val) => { state.connections = val; };
    const setProviderNodes = (val) => { state.providerNodes = val; };

    const result = await fetchWithRetry(setLoading, setError, setConnections, setProviderNodes, 0, 0);

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(2); // providers + provider-nodes
    expect(state.connections.length).toBe(1);
    expect(state.error).toBeNull();
  });

  it('retries on failure and succeeds', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error 1'))
      .mockRejectedValueOnce(new Error('Network error 2'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connections: [{ provider: 'nvidia', connected: true }], nodes: [] })
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ nodes: [] }) });

    const state = { connections: [], providerNodes: [], loading: true, error: null };
    const setLoading = (val) => { state.loading = val; };
    const setError = (val) => { state.error = val; };
    const setConnections = (val) => { state.connections = val; };
    const setProviderNodes = (val) => { state.providerNodes = val; };

    const result = await fetchWithRetry(setLoading, setError, setConnections, setProviderNodes, 2, 50);

    // First attempt fails (2 rejected fetches), first retry succeeds (2 resolved fetches).
    // So the success happens on attempt index 1, consuming 4 fetches total.
    expect(result.success).toBe(true);
    expect(result.attempt).toBe(1);
    // 2 attempts × 2 fetches each = 4 calls
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(state.connections.length).toBe(1);
  });

  it('fails after max retries and sets error', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Timeout 1'))
      .mockRejectedValueOnce(new Error('Timeout 2'))
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockRejectedValueOnce(new Error('503 Service Unavailable'));

    const state = { connections: [], providerNodes: [], loading: true, error: null };
    const setLoading = (val) => { state.loading = val; };
    const setError = (val) => { state.error = val; };
    const setConnections = (val) => { state.connections = val; };
    const setProviderNodes = (val) => { state.providerNodes = val; };

    const result = await fetchWithRetry(setLoading, setError, setConnections, setProviderNodes, 2, 10);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to load providers after multiple attempts');
    expect(result.attempts).toBe(3); // 3 total attempts (0, 1, 2)
    expect(mockFetch).toHaveBeenCalledTimes(6); // 3 attempts × 2 fetches each
    expect(state.error).toBe('Failed to load providers after multiple attempts');
  });

  it('preserves existing data when refresh fails', async () => {
    // First successful load
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connections: [{ provider: 'nvidia', connected: true }], nodes: [] })
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ nodes: [] }) });

    const state = { connections: [], providerNodes: [], loading: true, error: null };
    const setLoading = (val) => { state.loading = val; };
    const setError = (val) => { state.error = val; };
    const setConnections = (val) => { state.connections = val; };
    const setProviderNodes = (val) => { state.providerNodes = val; };

    // First successful load
    await fetchWithRetry(setLoading, setError, setConnections, setProviderNodes, 0, 0);
    expect(state.connections.length).toBe(1);

    // Simulate refresh that fails - reset mock to fail
    mockFetch.mockReset();
    mockFetch.mockRejectedValue(new Error('Network error'));

    // Execute retry logic manually (simulate refresh behavior)
    setLoading(true);
    setError(null);
    const result = await fetchWithRetry(setLoading, setError, setConnections, setProviderNodes, 1, 10);

    // Verify existing data is preserved (not overwritten with empty array)
    expect(state.connections.length).toBeGreaterThan(0);
    expect(state.error).toBe('Failed to load providers after multiple attempts');
    expect(result.success).toBe(false);
  });
});