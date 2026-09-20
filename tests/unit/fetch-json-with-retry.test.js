import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchJsonWithRetry } from "../../src/lib/frontend/fetchJsonWithRetry.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

describe("fetchJsonWithRetry", () => {
  it("sucesso na 1a tentativa → dados retornados", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ connections: [{ provider: "nvidia" }] }),
    });
    const r = await fetchJsonWithRetry("/api/providers");
    expect(r.ok).toBe(true);
    expect(r.data.connections).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falha transitória na 1a tentativa → retry → dados retornados", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ connections: [] }) });
    const r = await fetchJsonWithRetry("/api/providers", {}, 2, 5);
    expect(r.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("todas as tentativas falham → erro explícito, NÃO sucesso silencioso", async () => {
    mockFetch.mockRejectedValue(new Error("503"));
    const r = await fetchJsonWithRetry("/api/providers", {}, 2, 5);
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("4xx não faz retry (fail fast, permanente)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "not found",
    });
    const r = await fetchJsonWithRetry("/api/combo/xyz", {}, 3, 5);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(404);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("5xx transitório faz retry e falha com erro após esgotar", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    });
    const r = await fetchJsonWithRetry("/api/settings", {}, 2, 5);
    expect(r.ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});