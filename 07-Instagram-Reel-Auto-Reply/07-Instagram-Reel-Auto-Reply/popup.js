const toggleBtn = document.getElementById("toggle-btn");
const statusText = document.getElementById("status-text");
const replyCountEl = document.getElementById("reply-count");
const speedBtns = document.querySelectorAll(".speed-btn");
const infoBar = document.querySelector(".info-bar");

let currentState = { isRunning: false, replyCount: 0 };

function updateUI(state) {
  currentState = state;
  if (state.isRunning) {
    toggleBtn.textContent = "Stop";
    toggleBtn.className = "toggle-btn stop";
    statusText.textContent = "Running";
    statusText.className = "status-badge running";
  } else {
    toggleBtn.textContent = "Start";
    toggleBtn.className = "toggle-btn start";
    statusText.textContent = state.statusText === "Stopped" ? "Stopped" : "Idle";
    statusText.className = "status-badge " + (state.statusText === "Stopped" ? "stopped" : "idle");
  }
  replyCountEl.textContent = state.replyCount || 0;
}

function showError(msg) {
  if (infoBar) {
    infoBar.textContent = msg;
    infoBar.style.color = "#ff6b6b";
    infoBar.style.fontWeight = "600";
  }
}

function sendToContent(message) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        showError("No active tab found. Open Instagram first.");
        resolve({});
        return;
      }

      const tab = tabs[0];
      if (!tab.url || !tab.url.includes("instagram.com")) {
        showError("Open instagram.com first, then try again.");
        resolve({});
        return;
      }

      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.log("sendMessage error:", chrome.runtime.lastError.message);
          showError("Content script not loaded. Refresh the Instagram page (F5) and try again.");
          resolve({});
          return;
        }
        if (response) {
          resolve(response);
        } else {
          showError("No response from content script. Refresh the Instagram page (F5).");
          resolve({});
        }
      });
    });
  });
}

toggleBtn.addEventListener("click", async () => {
  const response = await sendToContent({ action: "toggle" });
  if (response && (response.isRunning !== undefined)) {
    updateUI(response);
  }
});

speedBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    speedBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const min = parseInt(btn.dataset.min);
    const max = parseInt(btn.dataset.max);
    chrome.storage.local.set({ speedMin: min, speedMax: max });
    await sendToContent({ action: "updateSpeed", speedMin: min, speedMax: max });
  });
});

(async function init() {
  await sendToContent({ action: "togglePanel" });

  const response = await sendToContent({ action: "getStatus" });
  if (response && (response.isRunning !== undefined)) {
    updateUI(response);
    if (infoBar) {
      infoBar.textContent = "Open an Instagram DM chat, then click Start.";
      infoBar.style.color = "";
      infoBar.style.fontWeight = "";
    }
  }

  chrome.storage.local.get(["speedMin"], (result) => {
    if (result.speedMin) {
      speedBtns.forEach((btn) => {
        btn.classList.remove("active");
        if (parseInt(btn.dataset.min) === result.speedMin) {
          btn.classList.add("active");
        }
      });
    }
  });
})();
