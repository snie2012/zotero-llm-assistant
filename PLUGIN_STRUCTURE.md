# Zotero LLM Assistant - Plugin Structure

## Overview

This is a minimal Zotero 7+ plugin that follows the correct structure and can be installed successfully. It's based on the structure used by [Zutilo](https://github.com/wshanks/Zutilo) and other modern Zotero plugins.

## Directory Structure

```
zotero-llm-assistant/
│
├── addon/                     # Plugin files (packaged into XPI)
│   ├── bootstrap.js          # Plugin lifecycle handlers (startup/shutdown)
│   ├── manifest.json         # Zotero 7+ manifest
│   ├── install.rdf          # Legacy RDF format (for older installers)
│   ├── chrome.manifest      # Chrome resource mappings
│   └── content/             # Main JavaScript code
│       └── main.js          # Entry point for your functionality
│
├── scripts/                  # Build scripts
│   └── build.js             # Script to create XPI file
│
├── dist/                     # Build output (gitignored)
│   └── zotero-llm-assistant.xpi
│
├── .gitignore               # Git ignore rules
├── .eslintrc.json          # ESLint configuration
├── package.json            # Node.js package configuration
├── README.md               # Main documentation
├── QUICKSTART.md          # Quick start guide
└── PLUGIN_STRUCTURE.md    # This file

```

## Key Files Explained

### addon/bootstrap.js
Handles the plugin lifecycle in Zotero:
- `install()` - Called when plugin is first installed
- `uninstall()` - Called when plugin is removed
- `startup()` - Called when Zotero starts with plugin enabled
- `shutdown()` - Called when plugin is disabled or Zotero shuts down

### addon/manifest.json
Modern manifest for Zotero 7+ plugins. Defines:
- Plugin metadata (name, version, description)
- Compatibility range (requires Zotero 7.0-7.*)
- Update URL for future updates

### addon/install.rdf
Legacy RDF format for compatibility with older installation methods.

### addon/chrome.manifest
Maps `chrome://` URLs to actual file paths. Allows referencing files via:
`chrome://zotero-llm-assistant/content/main.js`

### addon/content/main.js
The main JavaScript file where your LLM assistant logic will go. Currently contains:
- Initialization code
- Placeholder for future functionality

### scripts/build.js
Build script that creates the XPI file by zipping the contents of the `addon/` directory.

## How It Works

1. **Installation**: When you install the `.xpi` file in Zotero, Zotero extracts it and looks for the manifest files.

2. **Startup**: When Zotero starts, it calls `bootstrap.js` → `startup()` function, which loads `content/main.js`.

3. **Runtime**: Your code in `main.js` runs and can interact with Zotero's API to access libraries, items, etc.

4. **Shutdown**: When Zotero closes or the plugin is disabled, `shutdown()` is called to clean up.

## Building the Plugin

To create the `.xpi` file:

```bash
cd zotero-llm-assistant
mkdir -p dist
cd addon
zip -r ../dist/zotero-llm-assistant.xpi .
```

## Installing in Zotero

1. Open Zotero
2. Tools → Add-ons
3. Click gear icon → "Install Add-on From File..."
4. Select `dist/zotero-llm-assistant.xpi`
5. Restart Zotero

## Next Steps for LLM Functionality

1. **Add API Integration**: In `main.js`, add code to call an LLM API (OpenAI, Anthropic, etc.)

2. **Create UI Elements**: 
   - Add menu items to the Tools menu
   - Create dialog boxes for user input
   - Add keyboard shortcuts

3. **Access Zotero Data**:
   ```javascript
   // Get selected items
   let items = ZoteroPane.getSelectedItems();
   
   // Get item metadata
   for (let item of items) {
     let title = item.getField('title');
     let authors = item.getCreators();
   }
   ```

4. **Store Configuration**:
   - Use Zotero's preferences API to store API keys
   - Create preferences panel for settings

## File Hierarchy Reference

Based on [Zutilo's structure](https://github.com/wshanks/Zutilo), a full-featured plugin might also include:

```
addon/
├── chrome/           # Chrome UI resources
├── skin/            # CSS and images
├── locale/          # Internationalization files
└── defaults/        # Default preferences
```

But for a minimal plugin, the current structure is sufficient.

## Testing

To verify the plugin works:
1. Install it in Zotero
2. Open Error Console (`Cmd+Shift+J` or `Ctrl+Shift+J`)
3. Look for console log messages from the plugin
4. Check that "Zotero LLM Assistant" appears in the Add-ons list

## Compatibility

- ✅ Zotero 7.0+
- ✅ Zotero Standalone
- ✅ Zotero for Firefox (via Zotero Connector)
- ✅ macOS, Windows, Linux

## Resources

- [Zotero Developer Documentation](https://www.zotero.org/support/dev)
- [Zutilo Plugin](https://github.com/wshanks/Zutilo) - Reference implementation
- [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit) - Advanced toolkit


