const CACHE_NAME = "contrast-guideline-pwa-v1";
const PDFJS_VERSION = "4.10.38";
const APP_SHELL = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.webmanifest",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part00",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part01",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part02",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part03",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part04",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part05",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part06",
  "assets/toc/contrast_guideline_toc.json",
  "assets/icons/icon.svg",
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`,
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
