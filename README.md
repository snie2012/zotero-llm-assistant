# Zotero LLM Assistant

An LLM (Large Language Model) assistant plugin for Zotero 7+.

The main feature is a new LLM assistant tab in the side panel, and by default the assistant will have all the context of the current item you're reading, so you don't have to copy paste information. It's a more seamless experience for people who use Zotero to read papers, and use LLM regularly to ask questions about the paper being read.

<img width="2011" height="1153" alt="Screenshot 2025-12-11 at 14 48 46" src="https://github.com/user-attachments/assets/f308f2f5-c476-4ad3-bd1a-2dcae501d74d" />


## Status

This is an early prototype and mainly developed with Cursor.

## Installation

### Building the Plugin

**Option 1: Using zip directly (recommended)**
```bash
cd zotero-llm-assistant
mkdir -p dist
cd addon
zip -r ../dist/zotero-llm-assistant.xpi .
```

**Option 2: Using npm build script**
```bash
cd zotero-llm-assistant
npm run build
```

Both methods will create `dist/zotero-llm-assistant.xpi`.

### Installing in Zotero

1. Open Zotero (version 7.0 or later)
2. Go to `Tools` → `Add-ons` (or `Plugins` in Zotero 7)
3. Click the gear icon (⚙️) in the upper right corner of the Add-ons Manager window
4. Select "Install Add-on From File..."
5. Navigate to and select the `dist/zotero-llm-assistant.xpi` file
6. Restart Zotero if prompted

### Verifying Installation

After installation, you should see "Zotero LLM Assistant" in the list of installed plugins. You can also check the console for initialization messages:
- Open Zotero
- Press `Cmd+Shift+J` (Mac) or `Ctrl+Shift+J` (Windows/Linux) to open the Error Console
- Look for "Starting Zotero LLM Assistant plugin" messages

## Development

### Project Structure

```
zotero-llm-assistant/
├── addon/              # Plugin files
│   ├── bootstrap.js    # Plugin lifecycle handlers
│   ├── manifest.json   # Plugin metadata (Zotero 7)
│   ├── install.rdf     # Legacy install metadata
│   ├── chrome.manifest # Chrome resource mappings
│   └── content/        # Main JavaScript code
│       └── main.js
├── scripts/
│   └── build.js        # Build script for XPI
├── dist/               # Build output directory
└── package.json        # Node.js configuration
```

### Modifying Files

- `addon/content/main.js`: Add your LLM assistant functionality here
- `addon/bootstrap.js`: Plugin lifecycle events (startup, shutdown, etc.)
- `addon/manifest.json`: Plugin metadata (name, version, etc.)

## Features (Planned)

- [x] LLM-powered research assistant
- [x] Basic QA
- [x] Read pdf text into context by default
- [x] Read html text into context by default
- [x] Markdown rendering
- [ ] Latex rendering (Mathjax)
- [ ] Context compression
- [ ] Quick answer for selected text
- [ ] UI improvements
- [ ] Support search API
- [ ] Support files API


## License

MIT

## Repository

This plugin is available on GitHub: [https://github.com/snie2012/zotero-llm-assistant](https://github.com/snie2012/zotero-llm-assistant)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

