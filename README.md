**CCCV**

Disable clipboard hijacking by disabling JavaScript via Chrome Debugger Protocol

**To Install:**

1. Clone this repository.
2. Open Chrome and go to chrome://extensions.
3. Enable Developer Mode (toggle in the top-right corner).
4. Click Load Unpacked.
5. Select the folder containing manifest.json, background.js, and the icons folder.


**To Use:**
1. Click the extension icon to disable JavaScript on the current tab.
2. The notice that the browser is being debugged will show

**To Re-enable JavaScript:**
1. Click the extension icon again.

**Behavior:**
1. The extension disables or enables JavaScript dynamically without refreshing the page.

**Debugger Usage:**

Debugging is enabled to toggle JavaScript, but it detaches automatically when no longer required. This is the most reliable method to toggle JavaScript without issues.


**Credits:**
- svgrepo for the icons
- Google for Debugger Protocol
