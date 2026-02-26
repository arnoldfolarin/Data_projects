// Service worker: handles Chrome DevTools Protocol mouse input
// so we can dispatch TRUSTED mouse events that trigger Instagram's hover/click

let debugTabId = null;
let attached = false;

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  const tabId = sender.tab?.id || msg.tabId;

  if (msg.action === "attachDebugger") {
    doAttach(tabId)
      .then(() => respond({ ok: true }))
      .catch((e) => respond({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === "detachDebugger") {
    doDetach()
      .then(() => respond({ ok: true }))
      .catch((e) => respond({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === "mouseMove") {
    cdpMouse("mouseMoved", msg.x, msg.y)
      .then(() => respond({ ok: true }))
      .catch((e) => respond({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === "mouseClick") {
    cdpClick(msg.x, msg.y)
      .then(() => respond({ ok: true }))
      .catch((e) => respond({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === "mouseWheel") {
    cdpMouseWheel(msg.x, msg.y, msg.deltaX || 0, msg.deltaY || 0)
      .then(() => respond({ ok: true }))
      .catch((e) => respond({ ok: false, error: e.message }));
    return true;
  }
});

function doAttach(tabId) {
  return new Promise((resolve, reject) => {
    if (attached && debugTabId === tabId) { resolve(); return; }
    if (attached) {
      chrome.debugger.detach({ tabId: debugTabId }, () => {
        attached = false;
        debugTabId = null;
        actualAttach(tabId).then(resolve).catch(reject);
      });
    } else {
      actualAttach(tabId).then(resolve).catch(reject);
    }
  });
}

function actualAttach(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        debugTabId = tabId;
        attached = true;
        resolve();
      }
    });
  });
}

function doDetach() {
  return new Promise((resolve) => {
    if (!attached || !debugTabId) { resolve(); return; }
    chrome.debugger.detach({ tabId: debugTabId }, () => {
      debugTabId = null;
      attached = false;
      resolve();
    });
  });
}

function cdpMouse(type, x, y, button = "none", clickCount = 0) {
  return new Promise((resolve, reject) => {
    if (!attached || !debugTabId) { reject(new Error("not attached")); return; }
    chrome.debugger.sendCommand(
      { tabId: debugTabId },
      "Input.dispatchMouseEvent",
      { type, x: Math.round(x), y: Math.round(y), button, clickCount },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }
    );
  });
}

function cdpMouseWheel(x, y, deltaX, deltaY) {
  return new Promise((resolve, reject) => {
    if (!attached || !debugTabId) { reject(new Error("not attached")); return; }
    chrome.debugger.sendCommand(
      { tabId: debugTabId },
      "Input.dispatchMouseEvent",
      { type: "mouseWheel", x: Math.round(x), y: Math.round(y), deltaX, deltaY },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }
    );
  });
}

async function cdpClick(x, y) {
  await cdpMouse("mousePressed", x, y, "left", 1);
  await new Promise((r) => setTimeout(r, 50));
  await cdpMouse("mouseReleased", x, y, "left", 1);
}

chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === debugTabId) { debugTabId = null; attached = false; }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === debugTabId) { debugTabId = null; attached = false; }
});
