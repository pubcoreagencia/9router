import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeFetchUrl, isPrivateIPv4, isPrivateIPv6 } from "../../open-sse/utils/ssrfGuard.js";
import { handleFetchCore } from "../../open-sse/handlers/fetch/index.js";

test("SSRF Guard: isPrivateIPv4 correctly classifies addresses", () => {
  // Private / loopback / reserved
  assert.equal(isPrivateIPv4("127.0.0.1"), true);
  assert.equal(isPrivateIPv4("127.255.255.255"), true);
  assert.equal(isPrivateIPv4("10.0.0.1"), true);
  assert.equal(isPrivateIPv4("10.254.1.1"), true);
  assert.equal(isPrivateIPv4("172.16.0.1"), true);
  assert.equal(isPrivateIPv4("172.31.255.255"), true);
  assert.equal(isPrivateIPv4("192.168.1.1"), true);
  assert.equal(isPrivateIPv4("169.254.169.254"), true);
  assert.equal(isPrivateIPv4("0.0.0.0"), true);
  assert.equal(isPrivateIPv4("224.0.0.1"), true);

  // Public valid addresses
  assert.equal(isPrivateIPv4("8.8.8.8"), false);
  assert.equal(isPrivateIPv4("1.1.1.1"), false);
  assert.equal(isPrivateIPv4("142.250.190.46"), false);
  assert.equal(isPrivateIPv4("172.15.0.1"), false); // Just below private class B
  assert.equal(isPrivateIPv4("172.32.0.1"), false); // Just above private class B
});

test("SSRF Guard: isPrivateIPv6 correctly classifies addresses", () => {
  assert.equal(isPrivateIPv6("::1"), true);
  assert.equal(isPrivateIPv6("::"), true);
  assert.equal(isPrivateIPv6("fc00::1"), true);
  assert.equal(isPrivateIPv6("fd12:3456:789a::1"), true);
  assert.equal(isPrivateIPv6("fe80::1"), true);
  assert.equal(isPrivateIPv6("::ffff:192.168.1.1"), true);

  // Public IPv6
  assert.equal(isPrivateIPv6("2001:4860:4860::8888"), false);
});

test("SSRF Guard: assertSafeFetchUrl rejects dangerous protocols and internal destinations", () => {
  // Dangerous schemes
  assert.throws(() => assertSafeFetchUrl("file:///etc/passwd"), /Prohibited protocol/);
  assert.throws(() => assertSafeFetchUrl("gopher://127.0.0.1:20127"), /Prohibited protocol/);
  assert.throws(() => assertSafeFetchUrl("ftp://internal.ftp"), /Prohibited protocol/);

  // Cloud metadata and loopback
  assert.throws(() => assertSafeFetchUrl("http://169.254.169.254/latest/meta-data/"), /SSRF Blocked/);
  assert.throws(() => assertSafeFetchUrl("http://localhost:20127/api"), /SSRF Blocked/);
  assert.throws(() => assertSafeFetchUrl("http://127.0.0.1:8080"), /SSRF Blocked/);
  assert.throws(() => assertSafeFetchUrl("http://10.0.0.5:5432"), /SSRF Blocked/);
  assert.throws(() => assertSafeFetchUrl("http://192.168.0.1/admin"), /SSRF Blocked/);
  assert.throws(() => assertSafeFetchUrl("http://server.local"), /SSRF Blocked/);
  assert.throws(() => assertSafeFetchUrl("http://db.internal"), /SSRF Blocked/);

  // Valid public URLs pass
  assert.doesNotThrow(() => assertSafeFetchUrl("https://example.com/article"));
  assert.doesNotThrow(() => assertSafeFetchUrl("https://news.ycombinator.com"));
  assert.doesNotThrow(() => assertSafeFetchUrl("https://github.com/trending"));
});

test("SSRF Guard: handleFetchCore rejects internal SSRF URLs with 400 before network request", async () => {
  const result = await handleFetchCore({
    url: "http://169.254.169.254/latest/meta-data/",
    provider: "firecrawl",
  });

  assert.equal(result.success, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /SSRF Blocked/);
});
