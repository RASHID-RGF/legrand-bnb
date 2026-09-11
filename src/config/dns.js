

// ============================================================
// LeGrand — Resilient DNS helper
// This machine's router DNS (192.168.100.1) has been seen dead,
// which makes every outbound connection fail with DNS timeouts
// (e.g. MongoDB Atlas: "queryTxt ETIMEOUT", fetch: "getaddrinfo
// ENOTFOUND"). Nothing in the app is wrong — name resolution is.
//
// Strategy: probe the system resolver once with a TXT query (the
// record type Atlas needs). If it answers, do nothing (corporate/VPN
// DNS is respected). If it fails or times out, point Node's resolver
// at public DNS and teach dns.lookup to fall back there too — a purely
// app-level workaround, no system config is touched.
// ============================================================
const dns = require('dns');

const PUBLIC_SERVERS = ['8.8.8.8', '1.1.1.1'];
const PROBE_HOST = 'google.com';

let probed = false;

// Returns true if the system resolver answers within a few seconds.
// Probes a TXT record, NOT an A record: some broken resolvers (this
// machine's router included) answer A queries fine but refuse or drop
// SRV/TXT queries — and SRV + TXT are exactly what mongodb+srv://
// (MongoDB Atlas) needs to resolve.
function systemResolverWorks(timeoutMs = 4000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    dns.resolve(PROBE_HOST, 'TXT', (err) => {
      clearTimeout(timer);
      resolve(!err);
    });
  });
}

// Custom lookup for net connections (mongoose / net.connect). Uses
// dns.resolve4, which honors dns.setServers — so TCP connections still
// resolve even when the OS resolver (getaddrinfo) is broken.
function dnsLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err) return callback(err);
    if (options && options.all) {
      return callback(null, addresses.map((a) => ({ address: a, family: 4 })));
    }
    callback(null, addresses[0], 4);
  });
}

// dns.lookup (used by fetch, undici, http etc.) ignores setServers and
// goes through the OS resolver. Wrap it so a failed system lookup falls
// back to dns.resolve4 (which honors the public servers set above).
function patchLookup() {
  const originalLookup = dns.lookup;
  dns.lookup = function lookupWithFallback(hostname, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    originalLookup(hostname, options, (err, address, family) => {
      if (!err) return callback(null, address, family);
      dns.resolve4(hostname, (err2, addresses) => {
        if (err2 || !addresses.length) return callback(err, address, family);
        if (options.all) {
          return callback(null, addresses.map((a) => ({ address: a, family: 4 })));
        }
        callback(null, addresses[0], 4);
      });
    });
  };
}

// Idempotent: probes once, then falls back to public DNS if needed.
// Returns true when the fallback was activated (callers can then attach
// the custom dnsLookup); false when the system resolver is fine.
async function ensureWorkingResolver() {
  if (probed) return false;
  probed = true;
  if (await systemResolverWorks()) return false; // system DNS is fine — leave it alone
  dns.setServers(PUBLIC_SERVERS);
  patchLookup();
  console.warn(
    '[dns] System resolver unreachable — using public DNS (8.8.8.8, 1.1.1.1) for this process.'
  );
  return true;
}

module.exports = { ensureWorkingResolver, dnsLookup };
