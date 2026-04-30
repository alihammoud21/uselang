// ── Connectivity probing ─────────────────────────────────────────────────────
// We never trust a single probe. Different networks block different hosts
// (some hotel Wi-Fi blocks Cloudflare, etc.). We race a
// small set of reliable captive-portal / small-response endpoints — if any
// succeed, we're online. Uses a safe timeout wrapper instead of relying on
// AbortSignal.timeout (which isn't available on all RN runtimes).

const CONNECTIVITY_TIMEOUT = 2000;

// These endpoints return small payloads (<1KB) and are cheap to HEAD/GET.
// We include Apple and Cloudflare to cover cases where Google is blocked.
const INTERNET_PROBES = [
  "https://www.apple.com/library/test/success.html",     // Apple captive probe — works in China
  "https://1.1.1.1/cdn-cgi/trace",                       // Cloudflare, reachable globally
  "https://captive.apple.com",                           // Apple secondary — works in China (replaces Google which is blocked by GFW)
];

function timeoutSignal(ms: number): AbortSignal {
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), ms);
  return ctl.signal;
}

async function canReach(url: string, method: "GET" | "HEAD" = "HEAD"): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method,
      signal: timeoutSignal(CONNECTIVITY_TIMEOUT),
      cache: "no-store",
    });
    // 2xx or 3xx (some captive portals redirect). Anything <500 proves the
    // host answered, which is good enough for "there is internet".
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}

/**
 * True if the device has any usable internet path.
 * Races multiple probes; any success counts.
 */
export async function isOnline(): Promise<boolean> {
  // Race all probes — resolve true as soon as the first succeeds.
  const result = await new Promise<boolean>((resolve) => {
    let resolved = false;
    let remaining = INTERNET_PROBES.length;
    INTERNET_PROBES.forEach(async (url) => {
      const ok = await canReach(url, "HEAD").catch(() => false);
      if (resolved) return;
      if (ok) {
        resolved = true;
        resolve(true);
        return;
      }
      remaining -= 1;
      if (remaining === 0 && !resolved) {
        resolved = true;
        resolve(false);
      }
    });
  });
  // Mandatory debug logging
  console.log(`[connectivity] NETWORK CHECK: ${result ? "ONLINE" : "OFFLINE"}`);
  return result;
}

/**
 * Check if Deepgram API is reachable.
 */
export async function isDeepgramReachable(): Promise<boolean> {
  return canReach("https://api.deepgram.com/v1/projects", "GET");
}

export type ConnectivityStatus = {
  online: boolean;
  deepgram: boolean;
};

/**
 * Run all connectivity checks in parallel.
 * Useful for the Settings screen's network panel.
 */
export async function checkConnectivity(): Promise<ConnectivityStatus> {
  const [online, deepgram] = await Promise.all([
    isOnline(),
    isDeepgramReachable(),
  ]);

  return { online, deepgram };
}
