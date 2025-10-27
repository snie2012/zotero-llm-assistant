# Zotero LLM Assistant

An LLM (Large Language Model) assistant plugin for Zotero 7+.

## Status

This is currently a minimal plugin that installs successfully. LLM assistant functionality is planned for future development.

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

- [ ] LLM-powered research assistant
- [ ] Context-aware citation suggestions
- [ ] Automated literature review assistance
- [ ] Intelligent note-taking suggestions
- [ ] Research question answering

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

