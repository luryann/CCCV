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

// Enhanced function to update both icon and tooltip
async function updateIconAndTooltip(tabId, isEnabled) {
  try {
    // Update the icon
    await chrome.action.setIcon({
      tabId,
      path: getIconPath(isEnabled)
    });

    // Create a detailed tooltip message
    const tooltipMessage = `JavaScript is ${isEnabled ? 'enabled' : 'disabled'}`;
    
    // Update the tooltip
    await chrome.action.setTitle({
      tabId,
      title: tooltipMessage
    });
  } catch (error) {
    console.error('Failed to update icon or tooltip:', error);
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

// Clean up storage when a tab is closed
async function cleanupTab(tabId) {
  try {
    await chrome.storage.local.remove(`${STATE_KEY}_${tabId}`);
    tabStates.delete(tabId);
  } catch (error) {
    console.error('Failed to cleanup tab:', error);
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
      // Attach debugger if not already attached
      try {
        await chrome.debugger.attach(debuggee, DEBUGGER_VERSION);
      } catch (error) {
        if (!error.message.includes('Already attached')) {
          throw error;
        }
      }
      await chrome.debugger.sendCommand(debuggee, 'Emulation.setScriptExecutionDisabled', {
        value: true
      });
    } else {
      if (await isDebuggerAttached(tabId)) {
        // Enable JavaScript and detach debugger
        await chrome.debugger.sendCommand(debuggee, 'Emulation.setScriptExecutionDisabled', {
          value: false
        });
        await chrome.debugger.detach(debuggee);
      }
    }

    // Update state, UI, and tooltip
    tabStates.set(tabId, isEnabled);
    await updateIconAndTooltip(tabId, isEnabled);
    await saveState(tabId, isEnabled);

  } catch (error) {
    console.error('Failed to toggle JavaScript:', error);
    // Show error in tooltip and badge
    await chrome.action.setTitle({
      tabId,
      title: `Error: ${error.message}`
    });
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
      // Restore normal tooltip
      const currentState = await loadState(tabId);
      await updateIconAndTooltip(tabId, currentState);
    }, 3000);
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

// Event Listeners
chrome.action.onClicked.addListener(async (tab) => {
  await toggleJavaScript(tab.id);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await cleanupTab(tabId);
});

// Handle tab updates and focus changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const isEnabled = await loadState(tabId);
    await updateIconAndTooltip(tabId, isEnabled);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const isEnabled = await loadState(activeInfo.tabId);
  await updateIconAndTooltip(activeInfo.tabId, isEnabled);
});

// Handle debugger detach events
chrome.debugger.onDetach.addListener((source) => {
  const tabId = source.tabId;
  // Re-attach debugger if needed and tab still exists
  chrome.tabs.get(tabId).then(async () => {
    const isEnabled = tabStates.get(tabId);
    if (typeof isEnabled !== 'undefined' && !isEnabled) {
      await toggleJavaScript(tabId);
    }
  }).catch(() => {
    // Tab no longer exists, clean up
    cleanupTab(tabId);
  });
});
