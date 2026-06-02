/*
 * Clean SERP — content script (runs at document_start).
 *
 * Strategy:
 *  1. Optimistically add hide-classes to <html> *synchronously* so the
 *     static CSS hides ads/AI before first paint (no flash).
 *  2. Read saved settings; if a feature is OFF, remove its class
 *     (revealing content never causes an ad-flash).
 *  3. A tiny debounced MutationObserver tags the dynamic blocks that
 *     CSS selectors can't reach (AI Overview, inline "Sponsored" cards).
 */
(() => {
  "use strict";

  const ROOT = document.documentElement;
  const CLS_ADS = "csp-hide-ads";
  const CLS_AI = "csp-hide-ai";

  // 1) Optimistic ON — instant, before paint.
  ROOT.classList.add(CLS_ADS, CLS_AI);

  let settings = { hideAds: true, hideAi: true };

  function applySettings() {
    ROOT.classList.toggle(CLS_ADS, settings.hideAds !== false);
    ROOT.classList.toggle(CLS_AI, settings.hideAi !== false);
  }

  // 2) Load real settings (async). Defaults stay ON if unset.
  try {
    chrome.storage.sync.get(["hideAds", "hideAi"], (stored) => {
      if (chrome.runtime.lastError) return;
      if (typeof stored.hideAds === "boolean") settings.hideAds = stored.hideAds;
      if (typeof stored.hideAi === "boolean") settings.hideAi = stored.hideAi;
      applySettings();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      if (changes.hideAds) settings.hideAds = changes.hideAds.newValue !== false;
      if (changes.hideAi) settings.hideAi = changes.hideAi.newValue !== false;
      applySettings();
    });
  } catch (_) {
    /* storage unavailable — stay optimistic ON */
  }

  // ---- 3) Dynamic tagging ------------------------------------------------

  // "AI Overview" label across common locales (lowercased, trimmed).
  const AI_LABELS = new Set([
    "ai overview",
    "aperçu ia",            // fr
    "übersicht mit ki",     // de
    "ki-übersicht",         // de
    "resumen con ia",       // es
    "panoramica ai",        // it
    "ai-overzicht",         // nl
    "visão geral da ia",    // pt-br
    "vista geral da ia",    // pt
    "ai による概要",         // ja
    "ai 개요",               // ko
    "обзор от ии",          // ru
  ]);

  // Containers we must never hide wholesale.
  const STOP_IDS = new Set([
    "rso", "center_col", "rcnt", "search", "main", "appbar", "cnt", "bres",
  ]);

  function isStop(el) {
    return !el || el === document.body || STOP_IDS.has(el.id) || el === ROOT;
  }

  // Climb to a sensible block ancestor without swallowing the whole results
  // column. Returns the highest safe ancestor (a child of a stop container).
  function blockAncestor(el) {
    let node = el;
    for (let i = 0; i < 14 && node && node.parentElement; i++) {
      if (isStop(node.parentElement)) return node;
      node = node.parentElement;
    }
    return el;
  }

  function tagAiOverviews(root) {
    // Candidate label carriers: headings + small text spans/divs.
    const candidates = root.querySelectorAll(
      "h1, h2, h3, span, div[role='heading'], [aria-level]"
    );
    for (const el of candidates) {
      if (el.childElementCount > 2) continue;       // skip big containers
      const txt = (el.textContent || "").trim().toLowerCase();
      if (txt.length > 24 || !AI_LABELS.has(txt)) continue;
      const block = blockAncestor(el);
      if (block && !block.classList.contains("csp-ai")) {
        block.classList.add("csp-ai");
      }
    }
  }

  function tagSponsored(root) {
    // Inline ad cards labelled "Sponsored" that sit outside #tads/#tadsb.
    const spans = root.querySelectorAll("span, div[aria-label]");
    for (const el of spans) {
      if (el.childElementCount > 0) continue;
      const txt = (el.textContent || "").trim().toLowerCase();
      if (txt !== "sponsored" && txt !== "ad" && txt !== "ads") continue;
      // Ignore if already inside a CSS-hidden ad block.
      if (el.closest("#tads, #tadsb, #bottomads, [data-text-ad]")) continue;
      const block = blockAncestor(el);
      if (block && !block.classList.contains("csp-ad")) {
        block.classList.add("csp-ad");
      }
    }
  }

  function scan() {
    const root = document.getElementById("center_col") || document.body;
    if (!root) return;
    tagAiOverviews(root);
    tagSponsored(root);
  }

  // Debounced, idle-scheduled scanning to stay off the critical path.
  let scheduled = false;
  const ric =
    window.requestIdleCallback || ((fn) => setTimeout(() => fn(), 50));
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    ric(() => {
      scheduled = false;
      scan();
    });
  }

  function start() {
    scan(); // immediate first pass — don't wait on idle
    const target = document.getElementById("main") || document.body;
    if (!target) return;
    const mo = new MutationObserver(schedule);
    mo.observe(target, { childList: true, subtree: true });
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }
})();
