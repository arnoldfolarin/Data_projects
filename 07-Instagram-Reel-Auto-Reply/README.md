# Instagram Auto Reel Reply

A Chrome extension that automatically replies to reels (and optionally posts) in Instagram DMs with threaded replies. It scans the chat from bottom to top, uses Instagram’s Reply button for each item, and skips messages that already have a reply.

---

## What this project does

- **Detects** reels (and shared posts) in an open Instagram DM thread via DOM and accessibility markers (`aria-label`).
- **Clicks** the official Reply button and sends a random predefined reply so each reply is a proper threaded reply.
- **Scrolls** using simulated mouse wheel events (Chrome DevTools Protocol) so Instagram’s virtualized chat loads correctly.
- **Avoids duplicates** by tracking replied items (by URL path and DOM node) and by checking for existing replies in the thread.
- **Panel UI** on the page: Start/Stop, status, reply count, closable panel that reopens from the extension icon.

---

## Languages and technologies

| Category | Used in this project |
|----------|----------------------|
| **Languages** | **JavaScript** (content script, background service worker, popup logic), **HTML** (popup and injected panel), **CSS** (popup and panel styles) |
| **APIs / platform** | Chrome Extension APIs: `chrome.runtime`, `chrome.storage`, `chrome.tabs`, `chrome.debugger`; Chrome DevTools Protocol (CDP) for trusted input events |
| **Extension model** | Manifest V3 (service worker background, content scripts, optional host permissions) |
| **No backend server** | Everything runs in the browser; no Node, no separate server, no database |

---

## What this project demonstrates

- **Basic Git**  
  The project is versioned and can be pushed to GitHub (or any Git host). Cloning, committing, and pushing this repo is an example of using Git for a real project.

- **HTTP and network requests**  
  This extension does **not** call external REST APIs or use `fetch` to your own backend. It uses **Chrome’s internal messaging** (`chrome.runtime.sendMessage`) between the background script and content script, and the **Chrome Debugger API** to send input events. So it shows **in-process, browser-level “backend–frontend” communication**, not classic HTTP/network requests. To demonstrate HTTP explicitly, you could add a small feature that calls a public API (e.g. from the popup or background script).

- **Backend vs frontend (separation of concerns)**  
  The structure mirrors a backend–frontend split:
  - **Frontend:** Popup (options/controls), content script (floating panel, DOM scanning, hover/click orchestration), and styles. This is the user-facing, page-bound code.
  - **Backend-like:** Background service worker (debugger attach/detach, CDP mouse and wheel events). It has no DOM access, holds no UI, and only handles “system” behavior (trusted input, extension lifecycle). So the project shows a clear split between UI logic and non-UI, system-level logic.

---

## Installation

1. **Get the extension files**  
   Ensure this folder contains at least: `manifest.json`, `content.js`, `replies.js`, `background.js`, `popup.html`, `popup.js`, `popup.css`, `styles.css`, and an `icon.png` (or the icons referenced in `manifest.json`).

2. **Load in Chrome (or Edge)**  
   - Go to `chrome://extensions/` (or `edge://extensions/`).  
   - Turn on **Developer mode**.  
   - Click **Load unpacked** and select this folder.

3. **Use it**  
   - Open [instagram.com](https://www.instagram.com) and go to a DM with reels.  
   - Use the floating **Reel Auto Reply** panel (or the extension popup): click **Start**, then **Stop** when you want to pause.  
   - The first time you start, the browser may ask to “allow debugging” for the tab — click **Allow** so the extension can simulate mouse input.

---

## Speed and replies

- **Speed:** Adjust in the extension popup (e.g. Fast / Normal / Slow). Slower = safer with respect to rate limits.  
- **Reply text:** Edit the list in `replies.js` and reload the extension.

---

## Troubleshooting

- **“Debugger FAILED”** — Allow the browser’s debugging prompt on the Instagram tab, and close DevTools for that tab if it’s open.  
- **Replies to wrong things or duplicates** — The extension targets reels (and optionally posts) via specific `aria-label` values; if Instagram changes their markup, selectors in `content.js` may need updating.  
- **Panel or popup not showing** — Reload the extension and refresh the Instagram tab; ensure you’re on an Instagram DM page.

---

## Disclaimer

Automating interaction with Instagram may violate their Terms of Service. Use at your own risk. Prefer conservative speed settings and avoid long, unattended runs.
