/* ============================================================
   Thompson Finances — service worker

   Build 2026-08-13k

   ONE RULE: bump BUILD on every ship. The cache name is derived
   from it, so a new stamp means a new cache, and the old one is
   deleted on activate. Forget to bump it and the phone keeps
   serving yesterday's app no matter what GitHub is holding.

   The app is one HTML file. There is no bundle, no chunk graph,
   nothing to invalidate piecemeal — so the strategy is simple:

     the shell   cache-first, refreshed in the background
     the CDN     cache-first, kept forever (versioned URLs)
     fonts       cache-first
     everything  network, never cached

   The ledger is NOT here. It lives in localStorage on the device
   and never passes through this file. Clearing the cache costs
   the app, never the data.
   ============================================================ */

const BUILD  = '2026-08-13k';
const SHELL  = `thompson-shell-${BUILD}`;
const VENDOR = 'thompson-vendor-v1';   /* versioned URLs; survives ships */

/* The shell: what the app needs to open with no network at all.
   Relative so it works from a project subpath as well as a root. */
const SHELL_FILES = [
  './',
  './index.html',
  './favicon.ico',
  './favicon-32.png',
  './favicon-16.png',
  './apple-touch-icon.png',
];

/* Third-party code, at pinned versions. These URLs never change
   contents, so once cached they are correct forever — and they are
   what makes an import work on a plane. Not precached: they are
   picked up the first time they are actually fetched, so a first
   launch stays fast and a CDN outage cannot block installation. */
const VENDOR_HOSTS = [
  'https://cdnjs.cloudflare.com/',
  'https://fonts.googleapis.com/',
  'https://fonts.gstatic.com/',
];
const isVendor = url => VENDOR_HOSTS.some(h => url.startsWith(h));

/* ---------- install ---------- */
/* `addAll` is all-or-nothing, and an icon that has not been uploaded
   yet would fail the whole install and leave the app uncached. Each
   file is added on its own so a missing one costs only itself. */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(SHELL_FILES.map(async f => {
      try { await cache.add(new Request(f, { cache: 'reload' })); }
      catch (_) { /* one missing asset must not sink the install */ }
    }));
    /* The page reloads itself the moment this worker reaches
       `installed`. Without this it would reload into the OLD worker
       and the new build would sit waiting until every tab closed --
       which, on a Home Screen icon, can be days. */
    await self.skipWaiting();
  })());
});

/* ---------- activate ---------- */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, VENDOR]);
    const names = await caches.keys();
    await Promise.all(names.map(n => keep.has(n) ? null : caches.delete(n)));
    /* Navigation preload shaves a round trip off the first paint on
       a warm start; harmless where it is not supported. */
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

/* ---------- fetch ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;

  /* The Anthropic API, and anything else the app talks to, is never
     cached. A cached answer to a question about this month's money
     is a wrong answer. */
  if (url.startsWith('https://api.anthropic.com/')) return;

  /* --- navigation: the app shell --- */
  /* Cache-first so the icon opens instantly and works offline, with a
     background refresh so the next launch is current. The page's own
     update check (and the 30-minute poll) is what actually notices a
     new build; this just keeps the copy warm. */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match('./index.html');

      const fresh = (async () => {
        try {
          const preload = await event.preloadResponse;
          const res = preload || await fetch(req);
          if (res && res.ok) cache.put('./index.html', res.clone());
          return res;
        } catch (_) { return null; }
      })();

      if (hit) { event.waitUntil(fresh); return hit; }
      return (await fresh) || new Response(
        '<!doctype html><meta charset="utf-8"><title>Offline</title>'
        + '<body style="font:16px system-ui;padding:2rem">'
        + 'Thompson Finances is not cached on this device yet, and there is no network. '
        + 'Open it once while online.</body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 });
    })());
    return;
  }

  /* --- pinned third-party code and fonts --- */
  if (isVendor(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(VENDOR);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        /* `opaque` covers the cross-origin font and CDN responses that
           come back without CORS. They cannot be inspected, only
           replayed -- which is exactly what is wanted. */
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch (_) {
        return new Response('', { status: 504, statusText: 'offline' });
      }
    })());
    return;
  }

  /* --- same-origin assets: icons, and anything added later --- */
  if (new URL(url).origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (_) {
        return new Response('', { status: 504, statusText: 'offline' });
      }
    })());
  }
});

/* ---------- messages ---------- */
/* A hatch for the page to force the swap without waiting. Unused by
   the current build -- `skipWaiting` on install already covers it --
   and left here so a future "update now" button has somewhere to
   talk to. */
self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
  if (event.data === 'build') {
    event.source && event.source.postMessage({ build: BUILD });
  }
});
