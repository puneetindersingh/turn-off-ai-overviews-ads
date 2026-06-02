"use strict";

const KEYS = ["hideAi", "hideAds"];

function load() {
  chrome.storage.sync.get(KEYS, (stored) => {
    for (const key of KEYS) {
      const el = document.getElementById(key);
      // Default ON when unset.
      el.checked = stored[key] !== false;
    }
  });
}

function bind() {
  for (const key of KEYS) {
    const el = document.getElementById(key);
    el.addEventListener("change", () => {
      chrome.storage.sync.set({ [key]: el.checked });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  bind();
});
