# Quick Start Guide

## What is This?

This is a minimal Zotero 7+ plugin that installs successfully. It serves as a foundation for building an LLM assistant into Zotero.

## Quick Installation

1. **Build the plugin** (if not already done):
   ```bash
   cd zotero-llm-assistant
   mkdir -p dist
   cd addon
   zip -r ../dist/zotero-llm-assistant.xpi .
   cd ..
   ```

2. **Install in Zotero**:
   - Open Zotero
   - Go to `Tools` → `Add-ons`
   - Click the gear icon (⚙️)
   - Select "Install Add-on From File..."
   - Choose `zotero-llm-assistant/dist/zotero-llm-assistant.xpi`
   - Restart Zotero

3. **Verify it's working**:
   - The plugin should appear in your Add-ons list
   - Open Error Console (`Cmd+Shift+J` or `Ctrl+Shift+J`)
   - Look for: "Starting Zotero LLM Assistant plugin"

## What's Included

- ✅ Proper Zotero 7+ plugin structure
- ✅ Bootstrap.js with lifecycle handlers
- ✅ Manifest.json for Zotero 7 compatibility
- ✅ Chrome manifest for resource mapping
- ✅ Basic main.js module
- ✅ Build script for creating XPI files

## Next Steps

To add LLM functionality, you'll want to:
1. Add LLM integration in `addon/content/main.js`
2. Create UI elements (menu items, dialogs, etc.)
3. Implement API calls to your preferred LLM service
4. Handle Zotero data access and manipulation

## File Structure

```
addon/
├── bootstrap.js        ← Plugin lifecycle (startup/shutdown)
├── manifest.json       ← Zotero 7 manifest
├── install.rdf         ← Legacy RDF manifest
├── chrome.manifest     ← Resource mappings
└── content/
    └── main.js         ← Your code goes here!
```

## Troubleshooting

- **Plugin doesn't appear**: Make sure you're using Zotero 7.0+
- **Installation fails**: Check the Error Console for messages
- **Want to modify**: Edit files in `addon/` and rebuild the XPI

## References

- [Zotero Dev Documentation](https://www.zotero.org/support/dev)
- [Zutilo Plugin](https://github.com/wshanks/Zutilo) (example implementation)


