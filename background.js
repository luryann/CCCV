const STATE_KEY = 'jsToggleState';
const DEBUGGER_VERSION = '1.3';

// Store for managing tab states
const tabStates = new Map();

// Helper to get the icon path based on JS state
const getIconPath = (isEnabled) => ({
  16: `icons/js-${isEnabled ? 'enabled' : 'disabled'}-16.png`,
  32: `icons/js-${isEnabled ? 'enabled' : 'disabled'}-32.png`,
  48: `icons/js-${isEnabled ? 'enabled' : 'disabled'}-48.png`,
  128: `icons/js-${isEnabled ? 'enabled' : 'disabled'}-128.png`
});

// Update the extension icon to reflect current state
async function updateIcon(tabId, isEnabled) {
  try {
    await chrome.action.setIcon({
      tabId,
      path: getIconPath(isEnabled)
    });
  } catch (error) {
    console.error('Failed to update icon:', error);
  }
}

// Save state to chrome.storage
async function saveState(tabId, isEnabled) {
  try {
    await chrome.storage.local.set({
      [`${STATE_KEY}_${tabId}`]: isEnabled
    });
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

// Load state from chrome.storage
async function loadState(tabId) {
  try {
    const result = await chrome.storage.local.get(`${STATE_KEY}_${tabId}`);
    return result[`${STATE_KEY}_${tabId}`] ?? true; // Default to enabled
  } catch (error) {
    console.error('Failed to load state:', error);
    return true; // Default to enabled on error
  }
}

// Clean up storage and debugger when a tab is closed
async function cleanupTab(tabId) {
  try {
    await chrome.storage.local.remove(`${STATE_KEY}_${tabId}`);
    tabStates.delete(tabId);
    
    // Detach debugger if it's attached
    try {
      await chrome.debugger.detach({ tabId });
    } catch (error) {
      // Ignore if debugger wasn't attached
      if (!error.message.includes('not attached')) {
        console.error('Failed to detach debugger during cleanup:', error);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup tab:', error);
  }
}

// Check if debugger is attached to a tab
async function isDebuggerAttached(tabId) {
  try {
    const targets = await chrome.debugger.getTargets();
    return targets.some(target => target.tabId === tabId && target.attached);
  } catch (error) {
    console.error('Failed to check debugger status:', error);
    return false;
  }
}

// Toggle JavaScript for the given tab
async function toggleJavaScript(tabId) {
  let debuggee = { tabId };
  
  try {
    // Check if the tab exists and has a valid URL
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://')) {
      throw new Error('Cannot toggle JavaScript on this page');
    }

    // Get current state or load from storage
    let isEnabled = tabStates.get(tabId);
    if (typeof isEnabled === 'undefined') {
      isEnabled = await loadState(tabId);
    }

    // Toggle the state
    isEnabled = !isEnabled;

    if (!isEnabled) {
      // Disabling JavaScript - attach debugger if not already attached
      if (!(await isDebuggerAttached(tabId))) {
        await chrome.debugger.attach(debuggee, DEBUGGER_VERSION);
      }
      await chrome.debugger.sendCommand(debuggee, 'Emulation.setScriptExecutionDisabled', {
        value: true
      });
    } else {
      // Enabling JavaScript
      if (await isDebuggerAttached(tabId)) {
        // First enable JavaScript execution
        await chrome.debugger.sendCommand(debuggee, 'Emulation.setScriptExecutionDisabled', {
          value: false
        });
        // Then detach the debugger
        await chrome.debugger.detach(debuggee);
      }
    }

    // Update state and UI
    tabStates.set(tabId, isEnabled);
    await updateIcon(tabId, isEnabled);
    await saveState(tabId, isEnabled);

    // Execute content script to handle dynamic JavaScript state
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (enabled) => {
        // Notify the page that JavaScript state has changed
        window.dispatchEvent(new CustomEvent('javascriptToggled', { 
          detail: { enabled } 
        }));
      },
      args: [isEnabled]
    });

  } catch (error) {
    console.error('Failed to toggle JavaScript:', error);
    // Show error in extension popup or badge
    await chrome.action.setBadgeText({
      tabId,
      text: '!'
    });
    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: '#FF0000'
    });
    
    // Clear error badge after 3 seconds
    setTimeout(async () => {
      await chrome.action.setBadgeText({
        tabId,
        text: ''
      });
    }, 3000);
  }
}

// Event Listeners
chrome.action.onClicked.addListener(async (tab) => {
  await toggleJavaScript(tab.id);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await cleanupTab(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const isEnabled = await loadState(tabId);
    await updateIcon(tabId, isEnabled);
    
    // If JavaScript is disabled for this tab, ensure it stays disabled
    if (!isEnabled && !(await isDebuggerAttached(tabId))) {
      await toggleJavaScript(tabId);
    }
  }
});

// Handle debugger detach events
chrome.debugger.onDetach.addListener(async (source) => {
  const tabId = source.tabId;
  // Only re-attach if JavaScript should be disabled
  const isEnabled = tabStates.get(tabId);
  if (typeof isEnabled !== 'undefined' && !isEnabled) {
    try {
      await toggleJavaScript(tabId);
    } catch (error) {
      console.error('Failed to re-attach debugger:', error);
    }
  }
});
