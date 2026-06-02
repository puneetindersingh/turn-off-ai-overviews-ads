# Turn Off AI Overviews & Ads on Google

A fast, privacy-respecting Chrome extension (Manifest V3) that hides, disables and removes **Google AI Overviews** and **ads** from Google Search results.

## Why it's fast & flash-free
- Hides everything via **static CSS injected at `document_start`** — elements never paint before being hidden.
- Defaults are applied **optimistically** (on) before async storage loads; disabling a toggle only ever *reveals* content, so there's never a flash of ads.
- The only JavaScript on the critical path is one class toggle. A debounced, idle-scheduled `MutationObserver` tags the dynamic blocks (AI Overview, inline "Sponsored" cards) that pure CSS can't reach.

## What it removes
- **Ads:** top/bottom text ads (`#tads`, `#tadsb`, `#bottomads`), shopping/PLA units, sidebar commercial units, and inline "Sponsored" cards.
- **AI Overviews:** the AI-generated answer block (label-matched across 11 locales).

## Permissions (minimal — passes store review easily)
- `storage` — remember your two toggle settings (synced across your devices).
- Host access limited to **Google Search** domains only. No `tabs`, no `<all_urls>`, no background network, **no remote code**.

## Privacy
Collects **nothing**. No analytics, no network requests, no data leaves your browser. See [PRIVACY.md](PRIVACY.md).

## Install (development / unpacked)
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** → select the `google-serp-cleaner/` folder
4. Search on Google — ads and AI Overviews are gone. Click the toolbar icon to toggle either off.

## Publish to the Chrome Web Store
Upload `dist/google-serp-cleaner-v1.0.0.zip` at the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). Listing copy is in [STORE_LISTING.md](STORE_LISTING.md).

## Project structure
```
manifest.json          MV3 config, scoped to Google Search domains
content/
  hide.css             static, class-scoped hide rules (no flash)
  content.js           optimistic toggle + debounced observer
popup/
  popup.html/.css/.js  two-toggle UI (dark-mode aware)
icons/                 16 / 32 / 48 / 128 px
dist/                  store .zip + self-distribution .crx/.pem
```

## Maintenance note
Google changes its SERP DOM frequently. If a new ad format or the AI Overview block reappears, update the selectors in `content/hide.css` and the label set / detection in `content/content.js`.
