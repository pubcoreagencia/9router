/**
 * SSRF Guard Utility (OWASP A10 / Server-Side Request Forgery Hardening)
 * Strictly validates user-influenced destination URLs before any server-side fetch.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "169.254.169.254", // Cloud metadata (AWS, GCP, Azure, OpenStack)
  "metadata.google.internal",
  "instance-data",
]);

const BLOCKED_DOMAINS = [
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp",
  ".onion",
];

/**
 * Checks if an IPv4 address is in private, loopback, or reserved range.
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 10.0.0.0/8 (RFC 1918 Private Class A)
  if (b0 === 10) return true;
  // 172.16.0.0/12 (RFC 1918 Private Class B)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.168.0.0/16 (RFC 1918 Private Class C)
  if (b0 === 192 && b1 === 168) return true;
  // 169.254.0.0/16 (RFC 3927 Link-Local / Cloud Metadata)
  if (b0 === 169 && b1 === 254) return true;
  // 100.64.0.0/10 (RFC 6598 Shared Carrier NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 224.0.0.0/4 (Multicast) or 240.0.0.0/4 (Reserved)
  if (b0 >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in private, loopback, or reserved range.
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;

  // IPv4-mapped hex format: ::ffff:7f00:1 or IPv4-compatible hex: ::7f00:1
  const hexMapped = normalized.match(/^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hexMapped) {
    const p1 = parseInt(hexMapped[1], 16);
    const p2 = parseInt(hexMapped[2], 16);
    const ip4 = [(p1 >> 8) & 0xff, p1 & 0xff, (p2 >> 8) & 0xff, p2 & 0xff].join(".");
    return isPrivateIPv4(ip4);
  }

  // IPv4-mapped dotted decimal: ::ffff:192.168.1.1
  const dottedMapped = normalized.match(/::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (dottedMapped) {
    return isPrivateIPv4(dottedMapped[1]);
  }

  // Deprecated 6to4 (2002::/16) embedding private IPv4
  const sixToFour = normalized.match(/^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})/i);
  if (sixToFour) {
    const p1 = parseInt(sixToFour[1], 16);
    const p2 = parseInt(sixToFour[2], 16);
    const ip4 = [(p1 >> 8) & 0xff, p1 & 0xff, (p2 >> 8) & 0xff, p2 & 0xff].join(".");
    return isPrivateIPv4(ip4);
  }

  // Unique local addresses (fc00::/7) or Link-local (fe80::/10)
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }

  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities.
 * Throws Error if URL is invalid, uses prohibited protocol, or points to internal network.
 * @param {string} rawUrl
 * @returns {URL}
 */
export function assertSafeFetchUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Invalid URL: string required");
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Protocol allowlist: http and https only
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`SSRF Blocked: Prohibited protocol "${parsed.protocol}". Only http: and https: are allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error(`SSRF Blocked: Prohibited destination host "${hostname}"`);
  }

  for (const suffix of BLOCKED_DOMAINS) {
    if (hostname.endsWith(suffix)) {
      throw new Error(`SSRF Blocked: Prohibited domain suffix "${suffix}" in "${hostname}"`);
    }
  }

  // Check IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new Error(`SSRF Blocked: Destination IP "${hostname}" is private or reserved.`);
    }
  }

  // Check IPv6
  if (hostname.includes(":")) {
    if (isPrivateIPv6(hostname)) {
      throw new Error(`SSRF Blocked: Destination IPv6 "${hostname}" is private or reserved.`);
    }
  }

  return parsed;
}
