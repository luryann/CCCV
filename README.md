# CCCV

Disable clipboard hijacking by disabling JavaScript via Chrome Debugger Protocol

<hr>

**To Install:**

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer Mode (toggle in the top-right corner).
4. Click Load Unpacked.
5. Select the folder containing `manifest.json`, `background.js`, and the `icons` folder.

<hr>

**To Use:**
1. Click the extension icon to disable JavaScript on the current tab.
2. The notice that the browser is being debugged will show ( `"CCCV" started debugging this browser` ). Do **not** click "Cancel". It is safe click the X to close the notice.

<hr>

**To Re-enable JavaScript:**
1. Click the extension icon again.
2. `"CCCV" started debugging this browser` should disappear shortly. If it doesn't, you can simply click 'Cancel' or the X to close it.

<hr>

**Behavior:**
1. The extension disables or enables JavaScript dynamically without refreshing the page.
2. If you hover over the extension icon, it will indicate whether JavaScript is enabled or disabled via the tooltip.

<hr>

**Debugger Usage:**
1. Debugging is enabled to toggle JavaScript, but it detaches automatically when no longer required. This is the most reliable method to toggle JavaScript without issues.

<hr>

**Credits:**
1. svgrepo for the icons
2. Google for Debugger Protocol
