/* પરિવાર સેતુ – Service Worker
   ૧) ઇન્ટરનેટ બંધ હોય તોપણ એપ ખૂલે (ઓફલાઇન કેશ)
   ૨) એપ બંધ હોય ત્યારે સમાજની સૂચના (પુશ) બતાવે
   નીચે FIREBASE_CONFIG માં એ જ config પેસ્ટ કરો જે index.html માં છે. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyACPJD1pqwLhfMXff2FToi-uLcphwKVjuU",
  authDomain: "parivar-setu-b19a1.firebaseapp.com",
  projectId: "parivar-setu-b19a1",
  messagingSenderId: "758784490556",
  appId: "1:758784490556:web:53cffd48ce4a20b2679739"
};

const VERSION = "parivar-setu-v3";
const APP_SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const CDN = [
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js",
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(APP_SHELL);
    for (const u of CDN) { try { await c.add(new Request(u, { mode: "no-cors" })); } catch (err) {} }
  }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const SKIP = /firestore\.googleapis\.com|identitytoolkit|securetoken|googleapis\.com\/(identitytoolkit|token)|firebaseinstallations|fcmregistrations|api\.anthropic\.com|cloudfunctions\.net|run\.app/;
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || SKIP.test(req.url)) return;
  // એપનું પેજ: પહેલાં ઇન્ટરનેટ, ન મળે તો ફોનમાં સાચવેલું
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put("index.html", cp)); return r; })
      .catch(() => caches.match("index.html").then(r => r || caches.match("./"))));
    return;
  }
  // ફોન્ટ, આઇકન, Firebase / QR લાઇબ્રેરી: ફોનમાં હોય તો તરત, પછી પાછળથી નવું લાવે
  const url = new URL(req.url);
  // ફોટા (Firebase Storage) પણ: એક વાર જોયેલા ફોટા ઇન્ટરનેટ વગર પણ દેખાય
  const cacheable = url.origin === location.origin || /gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|firebasestorage\.googleapis\.com|storage\.googleapis\.com|i\.ytimg\.com/.test(url.host);
  if (!cacheable) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

/* ---- પુશ સૂચના ---- */
try {
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
  if (FIREBASE_CONFIG) {
    firebase.initializeApp(FIREBASE_CONFIG);
    firebase.messaging().onBackgroundMessage(() => {});
  }
} catch (e) { /* ઇન્ટરનેટ ન હોય તોપણ ઓફલાઇન કેશ ચાલુ રહે */ }
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    return clients.openWindow("./");
  }));
});
