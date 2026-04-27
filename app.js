import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

const BOOK_ID = "contrast_guideline";
const PDF_B64_PARTS = [
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part00",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part01",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part02",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part03",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part04",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part05",
  "assets/books/pdf_chunks/contrast_guideline.pdf.b64.part06",
];
const TOC_URL = "assets/toc/contrast_guideline_toc.json";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
const DB_NAME = "contrast-guideline-reader";
const DB_VERSION = 1;

const state = {
  pdf: null,
  currentPage: Number(localStorage.getItem(`${BOOK_ID}:lastPage`) || 1),
  totalPages: 0,
  rendering: false,
  pendingPage: null,
  swipeStartX: 0,
  swipeStartY: 0,
};

const els = {
  canvas: document.querySelector("#pdfCanvas"),
  stage: document.querySelector("#pdfStage"),
  loading: document.querySelector("#loading"),
  pageStatus: document.querySelector("#pageStatus"),
  pageSlider: document.querySelector("#pageSlider"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  tocButton: document.querySelector("#tocButton"),
  markersButton: document.querySelector("#markersButton"),
  addMarkerButton: document.querySelector("#addMarkerButton"),
  tocDialog: document.querySelector("#tocDialog"),
  tocList: document.querySelector("#tocList"),
  markerDialog: document.querySelector("#markerDialog"),
  markerList: document.querySelector("#markerList"),
  addMarkerDialog: document.querySelector("#addMarkerDialog"),
  addMarkerForm: document.querySelector("#addMarkerForm"),
  cancelAddMarkerButton: document.querySelector("#cancelAddMarkerButton"),
  cancelAddMarkerButtonBottom: document.querySelector("#cancelAddMarkerButtonBottom"),
  selectedTextInput: document.querySelector("#selectedTextInput"),
  noteInput: document.querySelector("#noteInput"),
  colorInput: document.querySelector("#colorInput"),
  toast: document.querySelector("#toast"),
};

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function clampPage(page) {
  return Math.min(Math.max(Number(page) || 1, 1), state.totalPages || 1);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("markers")) {
        const store = db.createObjectStore("markers", { keyPath: "id" });
        store.createIndex("bookId", "bookId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withMarkerStore(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("markers", mode);
    const store = tx.objectStore("markers");
    const result = callback(store);
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function addMarker(marker) {
  await withMarkerStore("readwrite", (store) => store.put(marker));
}

async function deleteMarker(id) {
  await withMarkerStore("readwrite", (store) => store.delete(id));
}

async function getMarkers() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("markers", "readonly");
    const request = tx.objectStore("markers").getAll();
    request.onsuccess = () => {
      const markers = request.result
        .filter((marker) => marker.bookId === BOOK_ID)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      db.close();
      resolve(markers);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function renderPage(pageNumber) {
  if (!state.pdf) {
    return;
  }

  if (state.rendering) {
    state.pendingPage = pageNumber;
    return;
  }

  state.rendering = true;
  state.currentPage = clampPage(pageNumber);

  const page = await state.pdf.getPage(state.currentPage);
  const baseViewport = page.getViewport({ scale: 1 });
  const availableWidth = Math.max(280, els.stage.clientWidth - 18);
  const widthScale = availableWidth / baseViewport.width;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: widthScale * dpr });
  const cssWidth = Math.floor(viewport.width / dpr);
  const cssHeight = Math.floor(viewport.height / dpr);

  els.canvas.width = Math.floor(viewport.width);
  els.canvas.height = Math.floor(viewport.height);
  els.canvas.style.width = `${cssWidth}px`;
  els.canvas.style.height = `${cssHeight}px`;
  els.canvas.style.display = "block";
  els.loading.style.display = "none";

  const context = els.canvas.getContext("2d", { alpha: false });
  await page.render({ canvasContext: context, viewport }).promise;

  localStorage.setItem(`${BOOK_ID}:lastPage`, String(state.currentPage));
  els.pageStatus.textContent = `${state.currentPage} / ${state.totalPages} ページ`;
  els.pageSlider.value = String(state.currentPage);
  els.prevButton.disabled = state.currentPage <= 1;
  els.nextButton.disabled = state.currentPage >= state.totalPages;
  els.stage.scrollTo({ top: 0, left: 0 });

  state.rendering = false;
  if (state.pendingPage !== null) {
    const nextPage = state.pendingPage;
    state.pendingPage = null;
    await renderPage(nextPage);
  }
}

function goToPage(page) {
  renderPage(clampPage(page)).catch((error) => {
    console.error(error);
    toast("ページを表示できませんでした");
  });
}

function createTocItem(item, depth = 0) {
  const button = document.createElement("button");
  button.className = `list-item ${depth > 0 ? "toc-child" : ""}`;
  button.type = "button";
  button.innerHTML = `<span><strong>${item.title}</strong><small>ページ ${item.pdfPage}</small></span><span>›</span>`;
  button.addEventListener("click", () => {
    els.tocDialog.close();
    goToPage(item.pdfPage);
  });
  els.tocList.append(button);

  for (const child of item.children || []) {
    createTocItem(child, depth + 1);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadToc() {
  const response = await fetch(TOC_URL);
  const toc = await response.json();
  els.tocList.replaceChildren();
  for (const item of toc.items) {
    createTocItem(item);
  }
}

async function refreshMarkers() {
  const markers = await getMarkers();
  els.markerList.replaceChildren();

  if (markers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "list-item";
    empty.textContent = "保存済みマーカーはありません";
    els.markerList.append(empty);
    return;
  }

  for (const marker of markers) {
    const item = document.createElement("div");
    item.className = "list-item";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "list-item";
    const title = escapeHtml(marker.selectedText || "(テキストなし)");
    const note = escapeHtml(marker.note || "");
    const color = escapeHtml(marker.color);
    openButton.innerHTML = `
      <span>
        <strong>${title}</strong>
        <small>ページ ${marker.pdfPage} / 色: ${color}<br>${note}<br>${formatDate(marker.createdAt)}</small>
      </span>
      <span>›</span>
    `;
    openButton.addEventListener("click", () => {
      els.markerDialog.close();
      goToPage(marker.pdfPage);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", async () => {
      await deleteMarker(marker.id);
      await refreshMarkers();
      toast("マーカーを削除しました");
    });

    item.replaceChildren(openButton, deleteButton);
    els.markerList.append(item);
  }
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function setupEvents() {
  els.prevButton.addEventListener("click", () => goToPage(state.currentPage - 1));
  els.nextButton.addEventListener("click", () => goToPage(state.currentPage + 1));
  els.pageSlider.addEventListener("input", () => goToPage(Number(els.pageSlider.value)));
  els.tocButton.addEventListener("click", () => els.tocDialog.showModal());
  els.markersButton.addEventListener("click", async () => {
    await refreshMarkers();
    els.markerDialog.showModal();
  });
  els.addMarkerButton.addEventListener("click", () => {
    els.selectedTextInput.value = "";
    els.noteInput.value = "";
    els.colorInput.value = "yellow";
    els.addMarkerDialog.showModal();
  });
  els.cancelAddMarkerButton.addEventListener("click", () => {
    closeAddMarkerDialog();
  });
  els.cancelAddMarkerButtonBottom.addEventListener("click", closeAddMarkerDialog);
  els.addMarkerDialog.addEventListener("click", (event) => {
    if (event.target === els.addMarkerDialog) {
      closeAddMarkerDialog();
    }
  });
  els.addMarkerDialog.addEventListener("cancel", clearAddMarkerInputs);

  els.addMarkerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selectedText = els.selectedTextInput.value.trim();
    const note = els.noteInput.value.trim();
    if (!selectedText && !note) {
      toast("見出しメモまたはメモを入力してください");
      return;
    }

    const now = new Date().toISOString();
    await addMarker({
      id: `${BOOK_ID}-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      bookId: BOOK_ID,
      pdfPage: state.currentPage,
      selectedText,
      color: els.colorInput.value,
      note,
      rects: null,
      createdAt: now,
      updatedAt: now,
    });
    els.addMarkerDialog.close();
    clearAddMarkerInputs();
    toast("マーカーを保存しました");
  });

  els.stage.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    state.swipeStartX = touch.clientX;
    state.swipeStartY = touch.clientY;
  }, { passive: true });

  els.stage.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - state.swipeStartX;
    const dy = touch.clientY - state.swipeStartY;
    if (Math.abs(dx) > 58 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goToPage(state.currentPage + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

  window.addEventListener("resize", () => goToPage(state.currentPage));
}

function clearAddMarkerInputs() {
  els.selectedTextInput.value = "";
  els.noteInput.value = "";
  els.colorInput.value = "yellow";
}

function closeAddMarkerDialog() {
  clearAddMarkerInputs();
  els.addMarkerDialog.close();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register("sw.js?v=20260427-3");
    await registration.update();
  } catch (error) {
    console.warn("Service worker registration failed", error);
  }
}

async function boot() {
  setupEvents();
  await registerServiceWorker();

  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  await loadToc();
  const pdfData = await loadBundledPdfData();
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  state.pdf = await loadingTask.promise;
  state.totalPages = state.pdf.numPages;
  els.pageSlider.max = String(state.totalPages);
  await renderPage(state.currentPage);
  toast("初回読み込み後はオフラインでも使えます");
}

async function loadBundledPdfData() {
  const base64 = (
    await Promise.all(
      PDF_B64_PARTS.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`PDFデータを読み込めませんでした: ${response.status}`);
        }
        return response.text();
      })
    )
  ).join("").trim();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

boot().catch((error) => {
  console.error(error);
  els.loading.textContent = "PDFを読み込めませんでした。ネットワークまたはファイル配置を確認してください。";
  toast("起動に失敗しました");
});
