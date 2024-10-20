let isJsDisabled = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({})],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

function updateIcon(tabId, isJsEnabled) {
  console.log(`Updating icon for tab ${tabId}, JS enabled: ${isJsEnabled}`);
  const iconSuffix = isJsEnabled ? '' : '-gray';
  chrome.pageAction.setIcon({
    tabId: tabId,
    path: {
      "16": `icons/icon16${iconSuffix}.png`,
      "32": `icons/icon32${iconSuffix}.png`,
      "48": `icons/icon48${iconSuffix}.png`,
      "128": `icons/icon128${iconSuffix}.png`
    }
  });
}

function toggleJavaScript(tabId) {
  console.log(`Toggling JavaScript for tab ${tabId}`);
  if (isJsDisabled[tabId]) {
    // Re-enable JavaScript
    chrome.debugger.detach({tabId: tabId}, () => {
      if (chrome.runtime.lastError) {
        console.error('Error detaching debugger:', chrome.runtime.lastError);
      } else {
        isJsDisabled[tabId] = false;
        updateIcon(tabId, true);
        chrome.tabs.reload(tabId); // Refresh only when re-enabling
      }
    });
  } else {
    // Disable JavaScript
    chrome.debugger.attach({tabId: tabId}, "1.3", () => {
      if (chrome.runtime.lastError) {
        console.error('Error attaching debugger:', chrome.runtime.lastError);
      } else {
        chrome.debugger.sendCommand({tabId: tabId}, "Emulation.setScriptExecutionDisabled", {value: true}, () => {
          if (chrome.runtime.lastError) {
            console.error('Error disabling JavaScript:', chrome.runtime.lastError);
          } else {
            isJsDisabled[tabId] = true;
            updateIcon(tabId, false);
          }
        });
      }
    });
  }
}

chrome.pageAction.onClicked.addListener((tab) => {
  toggleJavaScript(tab.id);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Always show the page action
    chrome.pageAction.show(tabId);
    
    // Check if we have a stored state for this tab
    if (isJsDisabled.hasOwnProperty(tabId)) {
      updateIcon(tabId, !isJsDisabled[tabId]);
    } else {
      // If no stored state, assume JS is enabled
      updateIcon(tabId, true);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  delete isJsDisabled[tabId];
});

// Debugger is detached when extension is unloaded
chrome.runtime.onSuspend.addListener(() => {
  Object.keys(isJsDisabled).forEach(tabId => {
    if (isJsDisabled[tabId]) {
      chrome.debugger.detach({tabId: parseInt(tabId)});
    }
  });
});
