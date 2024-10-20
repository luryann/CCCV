Bypass WNNorton's clipboard hijacking by disabling JavaScript. 

To install:

1. Clone the repo
2. Go to `chrome://extensions`
3. Click `Load Unpacked`
4. Select the folder you cloned with manifest.json, background.js and icons folder.

To use:
1. Click the extension

To disable:
1. Click the extension again.
2. Page will refresh
3. Debugging should automatically disable after the page reloads 

When you click the extension, it will enable debugging, but this is the only way to disable js without having it complain.  When JS is enabled, the icon will have color, when disabled it will be gray.
