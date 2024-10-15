let isJsDisabled = {};

chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({})],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});

function updateIcon(tabId, isJsEnabled) {
  const iconName = isJsEnabled ? 'gray' : 'color';
  chrome.pageAction.setIcon({
    tabId: tabId,
    path: {
      "16": `icons/icon16-${iconName}.png`,
      "32": `icons/icon32-${iconName}.png`,
      "48": `icons/icon48-${iconName}.png`,
      "128": `icons/icon128-${iconName}.png`
    }
  });
}

function toggleJavaScript(tabId) {
  if (isJsDisabled[tabId]) {
    chrome.debugger.detach({tabId: tabId}, function() {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      } else {
        isJsDisabled[tabId] = false;
        updateIcon(tabId, true);
      }
    });
  } else {
    chrome.debugger.attach({tabId: tabId}, "1.3", function() {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      } else {
        chrome.debugger.sendCommand({tabId: tabId}, "Emulation.setScriptExecutionDisabled", {value: true}, function() {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          } else {
            isJsDisabled[tabId] = true;
            updateIcon(tabId, false);
          }
        });
      }
    });
  }
}

chrome.pageAction.onClicked.addListener(function(tab) {
  toggleJavaScript(tab.id);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    updateIcon(tabId, !isJsDisabled[tabId]);
  }
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  delete isJsDisabled[tabId];
});
