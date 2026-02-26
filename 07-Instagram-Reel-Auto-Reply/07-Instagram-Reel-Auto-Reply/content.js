(function () {
  "use strict";

  const TAG = "[ReelAutoReply]";
  let isRunning = false;
  let replyCount = 0;
  let lastReplyText = "";
  let speedMin = 3000;
  let speedMax = 8000;
  let statusEl, counterEl, startBtn, debugEl;
  let repliedSrcs = new Set();
  let repliedNodes = new WeakSet();
  let debuggerReady = false;

  function log(...args) { console.log(TAG, ...args); }
  function dbg(msg) {
    log(msg);
    if (debugEl) {
      const d = document.createElement("div");
      d.textContent = msg;
      debugEl.appendChild(d);
      debugEl.scrollTop = debugEl.scrollHeight;
      while (debugEl.children.length > 50) debugEl.removeChild(debugEl.firstChild);
    }
  }

  function loadSettings() {
    try {
      chrome?.storage?.local?.get(["speedMin", "speedMax", "repliedSrcs"], (r) => {
        if (r?.speedMin) speedMin = r.speedMin;
        if (r?.speedMax) speedMax = r.speedMax;
        if (r?.repliedSrcs) repliedSrcs = new Set(r.repliedSrcs);
      });
    } catch (e) { /* */ }
  }

  function persistState() {
    try { chrome?.storage?.local?.set({ replyCount, repliedSrcs: [...repliedSrcs] }); }
    catch (e) { /* */ }
  }

  function getRandomReply() {
    const pool = (typeof REEL_REPLIES !== "undefined" && REEL_REPLIES.length)
      ? REEL_REPLIES : ["lmaooo 💀", "bruh", "im dead 😭"];
    let reply, t = 0;
    do { reply = pool[Math.floor(Math.random() * pool.length)]; t++; }
    while (reply === lastReplyText && t < 10 && pool.length > 1);
    lastReplyText = reply;
    return reply;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const randDelay = () => Math.floor(Math.random() * (speedMax - speedMin)) + speedMin;
  function setStatus(t) { if (statusEl) statusEl.textContent = t; }
  function isOnDM() { return location.pathname.startsWith("/direct"); }

  // ── Background messaging ────────────────────────────────────────

  function bg(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (r) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(r || { ok: false });
          }
        });
      } catch (e) { resolve({ ok: false, error: e.message }); }
    });
  }

  async function attachDebugger() {
    const r = await bg({ action: "attachDebugger" });
    debuggerReady = r.ok;
    if (r.ok) {
      dbg("Debugger OK - real mouse enabled");
    } else {
      dbg("Debugger FAILED");
      dbg(r.error || "Debugger attach failed");
    }
    return r;
  }
  async function detachDebugger() { await bg({ action: "detachDebugger" }); debuggerReady = false; }

  async function mouseMoveTo(x, y) {
    if (!debuggerReady) return;
    await bg({ action: "mouseMove", x: Math.round(x), y: Math.round(y) });
  }
  async function mouseClickAt(x, y) {
    if (!debuggerReady) return;
    await bg({ action: "mouseClick", x: Math.round(x), y: Math.round(y) });
  }

  async function mouseWheel(x, y, deltaX, deltaY) {
    if (!debuggerReady) return;
    await bg({ action: "mouseWheel", x: Math.round(x), y: Math.round(y), deltaX, deltaY });
  }

  async function hoverTo(x, y) {
    // First move mouse to far-left edge (outside any message)
    await mouseMoveTo(5, y);
    await sleep(150);
    // Now move into the target area — this fires mouseenter
    await mouseMoveTo(x, y);
  }

  // ── Panel UI ────────────────────────────────────────────────────

  function createPanel() {
    const existing = document.getElementById("ig-auto-reply-panel");
    if (existing) existing.remove();
    const panel = document.createElement("div");
    panel.id = "ig-auto-reply-panel";
    panel.innerHTML = `
      <div class="ig-ar-header" id="ig-ar-drag-handle">
        <span class="ig-ar-title">Reel Auto Reply</span>
        <button id="ig-ar-minimize" class="ig-ar-min-btn">\u2212</button>
        <button id="ig-ar-close" class="ig-ar-min-btn">\u2715</button>
      </div>
      <div id="ig-ar-body" class="ig-ar-body">
        <div class="ig-ar-status-row">
          <span class="ig-ar-label">Status:</span>
          <span id="ig-ar-status" class="ig-ar-status">Idle</span>
        </div>
        <div class="ig-ar-status-row">
          <span class="ig-ar-label">Replies:</span>
          <span id="ig-ar-counter" class="ig-ar-counter">0</span>
        </div>
        <button id="ig-ar-start" class="ig-ar-btn ig-ar-btn-start">\u25B6 Start</button>
        <div id="ig-ar-debug" class="ig-ar-debug"></div>
      </div>`;
    document.body.appendChild(panel);
    statusEl = document.getElementById("ig-ar-status");
    counterEl = document.getElementById("ig-ar-counter");
    startBtn = document.getElementById("ig-ar-start");
    debugEl = document.getElementById("ig-ar-debug");
    startBtn.addEventListener("click", toggleBot);
    document.getElementById("ig-ar-minimize").addEventListener("click", () => {
      const b = document.getElementById("ig-ar-body");
      b.style.display = b.style.display === "none" ? "block" : "none";
    });
    document.getElementById("ig-ar-close").addEventListener("click", () => {
      panel.classList.add("ig-ar-hidden");
    });
    const handle = document.getElementById("ig-ar-drag-handle");
    let drag = false, ox = 0, oy = 0;
    handle.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON") return;
      drag = true;
      const r = panel.getBoundingClientRect();
      panel.style.left = r.left + "px"; panel.style.top = r.top + "px";
      panel.style.right = "auto"; panel.style.bottom = "auto";
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      panel.classList.add("ig-ar-dragging"); e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!drag) return;
      panel.style.left = Math.max(0, Math.min(e.clientX - ox, innerWidth - 265)) + "px";
      panel.style.top = Math.max(0, Math.min(e.clientY - oy, innerHeight - 50)) + "px";
    });
    document.addEventListener("mouseup", () => { if (drag) { drag = false; panel.classList.remove("ig-ar-dragging"); } });
    dbg("Panel ready.");
  }

  // ── Bot control ─────────────────────────────────────────────────

  function toggleBot() { isRunning ? stopBot() : startBot(); }
  async function startBot() {
    if (!isOnDM()) { setStatus("Open a DM first!"); return; }
    isRunning = true;
    startBtn.textContent = "\u23F9 Stop";
    startBtn.classList.replace("ig-ar-btn-start", "ig-ar-btn-stop");
    setStatus("Starting...");
    const attachResult = await attachDebugger();
    if (!debuggerReady) {
      dbg("Cannot proceed without debugger. " + (attachResult.error || "Allow the permission and try again."));
      dbg("Look at the top of the page and click Allow.");
      stopBot(); return;
    }
    runLoop();
  }
  async function stopBot() {
    isRunning = false;
    startBtn.textContent = "\u25B6 Start";
    startBtn.classList.replace("ig-ar-btn-stop", "ig-ar-btn-start");
    setStatus("Stopped");
    await detachDebugger();
  }

  // ── Find chat scroller ─────────────────────────────────────────

  function findChatScroller() {
    const main = document.querySelector("main");
    if (!main) return null;
    let best = null, bestScore = 0;
    for (const div of main.querySelectorAll("div")) {
      const cs = getComputedStyle(div);
      if (cs.overflowY !== "auto" && cs.overflowY !== "scroll") continue;
      const r = div.getBoundingClientRect();
      if (r.height < 100 || r.width < 150 || r.left < 60) continue;
      const score = r.height + div.scrollHeight;
      if (score > bestScore) { bestScore = score; best = div; }
    }
    if (best) {
      const r = best.getBoundingClientRect();
      dbg(`Scroller: ${Math.round(r.width)}x${Math.round(r.height)}, scrollH=${best.scrollHeight}`);
    }
    return best;
  }

  // ── Find the first unreplied reel or post visible in the viewport ───────
  // Returns a single item (process one at a time). Reels: Clip/Reel/Video. Posts: Photo/Carousel/Post.

  function stripQueryParams(url) {
    try {
      const u = new URL(url);
      // Use pathname only so same media on different CDNs (re-renders) still dedup
      return u.pathname || u.origin + u.pathname;
    } catch { return url; }
  }

  const SHARED_CONTENT_SELECTOR = [
    'svg[aria-label="Clip"]', 'svg[aria-label="clip"]', 'svg[aria-label="Reel"]', 'svg[aria-label="Video"]',
    'svg[aria-label="Photo"]', 'svg[aria-label="photo"]', 'svg[aria-label="Image"]', 'svg[aria-label="image"]',
    'svg[aria-label="Carousel"]', 'svg[aria-label="carousel"]', 'svg[aria-label="Post"]', 'svg[aria-label="post"]'
  ].join(', ');

  function findNextReel(scroller) {
    const clipIcons = scroller.querySelectorAll(SHARED_CONTENT_SELECTOR);

    // #region agent log
    const reelScanInfo = [];
    // #endregion

    for (const svg of clipIcons) {
      if (svg.closest("#ig-auto-reply-panel")) continue;
      const svgRect = svg.getBoundingClientRect();
      const svgInfo = {svgTop:Math.round(svgRect.top),svgBot:Math.round(svgRect.bottom),label:svg.getAttribute('aria-label')};

      if (svgRect.top < 50 || svgRect.bottom > innerHeight - 50) {
        reelScanInfo.push({...svgInfo,skip:'outOfBounds',innerH:innerHeight});
        continue;
      }

      const container = findMessageContainer(svg, scroller);
      if (!container) {
        reelScanInfo.push({...svgInfo,skip:'noContainer'});
        continue;
      }

      if (repliedNodes.has(container)) {
        reelScanInfo.push({...svgInfo,skip:'repliedNode'});
        continue;
      }

      const cRect = container.getBoundingClientRect();
      if (cRect.top < 0 || cRect.bottom > innerHeight) {
        reelScanInfo.push({...svgInfo,skip:'containerOOB',cTop:Math.round(cRect.top),cBot:Math.round(cRect.bottom)});
        continue;
      }

      const img = container.querySelector("img:not([style*='border-radius: 50%'])") ||
                  container.querySelector("img");
      const key = img ? stripQueryParams(img.src || "") : `clip_${Math.round(svgRect.top)}_${Math.round(svgRect.left)}`;
      if (repliedSrcs.has(key)) {
        reelScanInfo.push({...svgInfo,skip:'alreadyReplied',key:key.slice(-40)});
        continue;
      }

      if (hasExistingReply(container, scroller)) {
        reelScanInfo.push({...svgInfo,skip:'hasReplyInDOM'});
        dbg(`[SCAN] Skipping reel (already has reply in chat) cTop=${Math.round(cRect.top)}`);
        continue;
      }

      const label = (svg.getAttribute("aria-label") || "").toLowerCase();
      const isReel = /^(clip|reel|video)$/.test(label);

      // #region agent log
      dbg(`[SCAN] Found unreplied ${isReel ? "reel" : "post"} key=...${key.slice(-40)} cTop=${Math.round(cRect.top)} cBot=${Math.round(cRect.bottom)} skipped=${JSON.stringify(reelScanInfo)}`);
      // #endregion

      return { container, key, rect: cRect, isReel };
    }

    // #region agent log
    dbg(`[SCAN] No reel/post found. contentIcons=${clipIcons.length} scrollTop=${Math.round(scroller.scrollTop)} skipped=${JSON.stringify(reelScanInfo)}`);
    // #endregion

    return null;
  }

  function findMessageContainer(el, boundary) {
    // Walk up from the Clip SVG or image to find the message container.
    // We want the largest reasonable ancestor that isn't the scroller itself.
    let node = el.parentElement;
    let best = null;
    for (let i = 0; i < 25 && node && node !== boundary; i++) {
      const r = node.getBoundingClientRect();
      // Message containers are typically 200-700px wide and 100-500px tall
      if (r.width > 150 && r.height > 100) {
        best = node;
        // Keep going up to get the full message row (includes avatar + card)
        if (r.height > 300) break; // Don't go too high
      }
      node = node.parentElement;
    }
    return best;
  }

  // ── Check if a reel already has a threaded reply below it ───────

  function findMessageRow(container, scroller) {
    let node = container;
    while (node && node.parentElement !== scroller) {
      node = node.parentElement;
      if (!node) return container;
    }
    return node || container;
  }

  function hasExistingReply(container, scroller) {
    const row = findMessageRow(container, scroller);

    let sibling = row.nextElementSibling;
    for (let i = 0; i < 3 && sibling; i++, sibling = sibling.nextElementSibling) {
      const text = sibling.textContent || "";

      if (/replied to/i.test(text)) return true;

      const imgs = sibling.querySelectorAll("img");
      for (const img of imgs) {
        const r = img.getBoundingClientRect();
        if (r.width > 0 && r.width < 80 && r.height > 0 && r.height < 80) {
          const contentInSibling = sibling.querySelector(SHARED_CONTENT_SELECTOR);
          if (contentInSibling) return true;
        }
      }

      const quoteBar = sibling.querySelector(
        '[class*="reply"], [class*="quote"], [class*="Reply"], [class*="Quote"]'
      );
      if (quoteBar) return true;

      const nestedImgs = sibling.querySelectorAll("img");
      if (nestedImgs.length >= 2) {
        let smallCount = 0;
        for (const ni of nestedImgs) {
          const nr = ni.getBoundingClientRect();
          if (nr.width > 0 && nr.width < 60) smallCount++;
        }
        if (smallCount >= 1) return true;
      }
    }

    return false;
  }

  // ── Hover and click Reply ───────────────────────────────────────

  async function activateReplyForMessage(container) {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    dbg(`Hovering message at (${Math.round(centerX)}, ${Math.round(centerY)})...`);

    // Move mouse from left edge INTO the message (triggers mouseenter)
    await hoverTo(centerX, centerY);
    await sleep(1500);

    // Check for Reply button
    let replyBtn = findAnyNewButton("Reply");
    if (replyBtn) {
      dbg("Reply button found after center hover!");
      return replyBtn;
    }

    // Try hovering different parts of the message
    // Instagram might need hover on a specific child area
    const positions = [
      [rect.left + 20, centerY],           // Left edge of message
      [rect.right - 20, centerY],          // Right edge
      [centerX, rect.top + 20],            // Top
      [centerX, rect.bottom - 20],         // Bottom
      [rect.left + rect.width * 0.3, centerY], // Left-center
      [rect.left + rect.width * 0.7, centerY], // Right-center
    ];

    for (const [px, py] of positions) {
      if (!isRunning) return null;
      await hoverTo(px, py);
      await sleep(1200);

      replyBtn = findAnyNewButton("Reply");
      if (replyBtn) {
        dbg(`Reply button found at offset (${Math.round(px)}, ${Math.round(py)})!`);
        return replyBtn;
      }

      // Also check if More button appeared (alternative path)
      const moreBtn = findAnyNewButton("More");
      if (moreBtn) {
        dbg("More button found, clicking to find Reply...");
        const mr = moreBtn.getBoundingClientRect();
        await mouseClickAt(mr.left + mr.width / 2, mr.top + mr.height / 2);
        await sleep(800);
        // Look for Reply in the menu
        const menuReply = findTextInMenu("Reply");
        if (menuReply) {
          dbg("Reply found in More menu!");
          const rr = menuReply.getBoundingClientRect();
          await mouseClickAt(rr.left + rr.width / 2, rr.top + rr.height / 2);
          await sleep(600);
          return "menu"; // Signal that reply was activated via menu
        }
        // Close menu
        await mouseClickAt(5, 5);
        await sleep(300);
      }
    }

    dbg("Reply button NOT found after all hover attempts");
    // Log what DID appear (for debugging)
    const allLabels = [];
    for (const el of document.querySelectorAll("[aria-label]")) {
      if (el.closest("#ig-auto-reply-panel")) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        allLabels.push(el.getAttribute("aria-label"));
      }
    }
    dbg("Visible aria-labels: " + allLabels.join(", "));
    return null;
  }

  function findAnyNewButton(labelContains) {
    const lower = labelContains.toLowerCase();
    for (const el of document.querySelectorAll("[aria-label]")) {
      if (el.closest("#ig-auto-reply-panel")) continue;
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      if (label.includes(lower)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight) {
          return el;
        }
      }
    }
    // Also check by tooltip/title
    for (const el of document.querySelectorAll("[title]")) {
      if (el.closest("#ig-auto-reply-panel")) continue;
      const title = (el.getAttribute("title") || "").toLowerCase();
      if (title.includes(lower)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
    }
    return null;
  }

  function findTextInMenu(text) {
    const lower = text.toLowerCase();
    for (const el of document.querySelectorAll('button, [role="button"], [role="menuitem"], [tabindex]')) {
      if (el.closest("#ig-auto-reply-panel")) continue;
      if (el.textContent.trim().toLowerCase() === lower) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
    }
    return null;
  }

  // ── Type and send ───────────────────────────────────────────────

  async function typeAndSend(text) {
    const input = findInput();
    if (!input) { dbg("ERROR: No message input!"); return false; }

    const ir = input.getBoundingClientRect();
    await mouseClickAt(ir.left + ir.width / 2, ir.top + ir.height / 2);
    await sleep(400);
    input.focus();
    await sleep(200);

    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    await sleep(100);
    document.execCommand("insertText", false, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(400);

    // Press Enter
    const kOpts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true };
    input.dispatchEvent(new KeyboardEvent("keydown", kOpts));
    input.dispatchEvent(new KeyboardEvent("keypress", kOpts));
    input.dispatchEvent(new KeyboardEvent("keyup", kOpts));
    await sleep(500);
    return true;
  }

  function findInput() {
    for (const s of [
      'div[contenteditable="true"][role="textbox"]',
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"]',
    ]) {
      const el = document.querySelector(s);
      if (el && el.getBoundingClientRect().width > 0) return el;
    }
    return null;
  }

  // ── Main loop ───────────────────────────────────────────────────
  // Starts from the current scroll position (typically the bottom)
  // and scans upward, replying to each reel found along the way.

  async function runLoop() {
    setStatus("Finding chat...");
    await sleep(300);

    const scroller = findChatScroller();
    if (!scroller) { dbg("No chat scroller!"); await stopBot(); return; }

    repliedSrcs.clear();
    repliedNodes = new WeakSet();
    dbg("Scanning bottom to top (cleared previous session state)...");
    let totalReplied = 0;
    let topUnchanged = 0;
    let prevPos = scroller.scrollTop;
    // Exactly one reel/post in this run will get a second reply, at this 1-based position (e.g. 4–8)
    const doubleReplyAt = Math.floor(Math.random() * 5) + 4;
    let doubleReplyDone = false;

    while (isRunning) {
      setStatus(`Scanning... (${totalReplied} replied)`);

      // Wait for lazy-loaded content to render
      await sleep(1500);

      // Look for the first unreplied reel in the viewport
      const reel = findNextReel(scroller);

      if (reel) {
        topUnchanged = 0;

        // Mark immediately so drift-back rescans won't re-detect this reel
        repliedSrcs.add(reel.key);
        repliedNodes.add(reel.container);
        persistState();

        dbg(`Found ${reel.isReel ? "reel" : "post"} at y=${Math.round(reel.rect.top)}`);
        setStatus(`Replying #${totalReplied + 1}...`);

        // Move mouse away to reset hover state
        await mouseMoveTo(5, 5);
        await sleep(300);

        const posBeforeReply = scroller.scrollTop;

        // Hover the message and find the Reply button
        const replyResult = await activateReplyForMessage(reel.container);

        if (replyResult) {
          if (replyResult !== "menu") {
            const rr = replyResult.getBoundingClientRect();
            await mouseClickAt(rr.left + rr.width / 2, rr.top + rr.height / 2);
            await sleep(800);
          }
          const text = getRandomReply();
          const sent = await typeAndSend(text);
          if (sent) {
            totalReplied++;
            replyCount++;
            if (counterEl) counterEl.textContent = replyCount;
            dbg(`#${replyCount}: "${text.slice(0, 30)}" [threaded]`);

            // Exactly once per run: at a random reply (e.g. 4th–8th), allow one double-reply to this item
            if (totalReplied === doubleReplyAt && !doubleReplyDone) {
              dbg(`Double-reply slot #${doubleReplyAt}: allowing one more reply to this ${reel.isReel ? "reel" : "post"}`);
              repliedSrcs.delete(reel.key);
              repliedNodes.delete(reel.container);
              doubleReplyDone = true;
            }
          }
        } else {
          dbg("Skipped (no Reply button found)");
        }

        // Wait between replies
        if (isRunning) {
          const d = randDelay();
          setStatus(`Wait ${Math.round(d / 1000)}s...`);
          await sleep(d);
        }

        // If Instagram auto-scrolled away, wheel back to where we were
        const drift = scroller.scrollTop - posBeforeReply;
        if (Math.abs(drift) > 200) {
          dbg(`Scrolling back (drifted ${Math.round(drift)}px)`);
          const sr = scroller.getBoundingClientRect();
          await mouseWheel(sr.left + sr.width / 2, sr.top + sr.height / 2, 0, -drift);
          await sleep(1000);
        }

        // Advance UP past the reel we just replied to so the next reel comes into view
        const advancePx = Math.round(reel.rect.height) + 200;
        dbg(`Advancing up ${advancePx}px past replied reel`);
        const sr2 = scroller.getBoundingClientRect();
        await mouseWheel(sr2.left + sr2.width / 2, sr2.top + sr2.height / 2, 0, -advancePx);
        await sleep(1000);

        // Sync prevPos so top detection stays accurate
        prevPos = scroller.scrollTop;
        // #region agent log
        dbg(`[DRIFT] After correction+advance: scrollTop=${Math.round(scroller.scrollTop)} prevPos=${Math.round(prevPos)} scrollH=${scroller.scrollHeight} drift=${Math.round(drift)} advance=${advancePx}`);
        // #endregion

        // Re-scan at the new position
        continue;
      }

      // No reel found — scroll UP one notch (~300px)
      const preWheelTop = scroller.scrollTop;
      const scrollerRectNow = scroller.getBoundingClientRect();
      const wxNow = scrollerRectNow.left + scrollerRectNow.width / 2;
      const wyNow = scrollerRectNow.top + scrollerRectNow.height / 2;
      // #region agent log
      dbg(`[WHEEL-PRE] scrollTop=${Math.round(preWheelTop)} prevPos=${Math.round(prevPos)} wheelXY=(${Math.round(wxNow)},${Math.round(wyNow)}) scrollerRect=(${Math.round(scrollerRectNow.left)},${Math.round(scrollerRectNow.top)},${Math.round(scrollerRectNow.width)}x${Math.round(scrollerRectNow.height)}) scrollH=${scroller.scrollHeight} topUnchanged=${topUnchanged}`);
      // #endregion
      await mouseWheel(wxNow, wyNow, 0, -300);
      await sleep(500);

      // #region agent log
      const postWheelTop = scroller.scrollTop;
      dbg(`[WHEEL-POST] scrollTop=${Math.round(postWheelTop)} delta=${Math.round(postWheelTop - preWheelTop)} absVsPrev=${Math.round(Math.abs(postWheelTop - prevPos))}`);
      // #endregion

      // Detect if we've reached the top (scrollTop stopped changing)
      if (Math.abs(scroller.scrollTop - prevPos) < 5) {
        topUnchanged++;
        // #region agent log
        dbg(`[TOP-CHECK] topUnchanged=${topUnchanged} scrollTop=${Math.round(scroller.scrollTop)} prevPos=${Math.round(prevPos)}`);
        // #endregion
        if (topUnchanged >= 6) {
          dbg("Reached top of chat");
          break;
        }
      } else {
        topUnchanged = 0;
        prevPos = scroller.scrollTop;
      }
    }

    dbg(`Finished! ${totalReplied} total replies sent.`);
    setStatus(`Done! ${totalReplied} replies.`);
    await stopBot();
  }

  // ── Popup communication ─────────────────────────────────────────

  try {
    chrome?.runtime?.onMessage?.addListener((msg, sender, respond) => {
      if (msg.action === "toggle") { toggleBot(); respond({ isRunning, replyCount }); }
      else if (msg.action === "getStatus") {
        respond({ isRunning, replyCount, statusText: statusEl?.textContent || "Idle" });
      } else if (msg.action === "updateSpeed") {
        speedMin = msg.speedMin || speedMin;
        speedMax = msg.speedMax || speedMax;
        respond({ ok: true });
      } else if (msg.action === "togglePanel") {
        let panel = document.getElementById("ig-auto-reply-panel");
        if (!panel) {
          createPanel();
          panel = document.getElementById("ig-auto-reply-panel");
        }
        if (panel) panel.classList.remove("ig-ar-hidden");
        respond({ ok: true, isRunning, replyCount });
      }
      return true;
    });
  } catch (e) { /* */ }

  // ── Init ────────────────────────────────────────────────────────

  (function init() {
    log("Init:", location.href);
    loadSettings();
    createPanel();
  })();

})();
