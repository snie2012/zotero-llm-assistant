# GPT Tokenizer Library Setup

This directory should contain the `gpt-tokenizer` library for OpenAI token counting.

## Installation Instructions

Since OpenAI doesn't provide a dedicated token counting API, we use the open-source `gpt-tokenizer` library which implements OpenAI's tokenization logic.

### Option 1: Download from CDN (Recommended)

1. Download the browser bundle from:
   - https://unpkg.com/gpt-tokenizer@latest/dist/cl100k_base.js
   - Or use: https://cdn.jsdelivr.net/npm/gpt-tokenizer@latest/dist/cl100k_base.js

2. Save it as `gpt-tokenizer.js` in this directory (`addon/content/lib/`)

3. The library will expose a global `GPTTokenizer` object or `encode` function

### Option 2: Build from Source

If you have npm available:

```bash
npm install gpt-tokenizer
# Then copy the browser bundle from node_modules/gpt-tokenizer/dist/
```

### Option 3: Use jsdelivr CDN (if extension allows external scripts)

You can modify `bootstrap.js` to load from CDN instead:

```javascript
Services.scriptloader.loadSubScript(
  "https://cdn.jsdelivr.net/npm/gpt-tokenizer@latest/dist/cl100k_base.js",
  ctx
);
```

## Supported Models

- **GPT-3.5-turbo, GPT-4**: Uses `cl100k_base` encoding
- **GPT-5.1, o-series models**: Uses `o200k_base` encoding (fallback to `cl100k_base` if not available)

## Usage

The tokenizer is automatically loaded in `bootstrap.js` and used in `chatgpt.js` via the `getTokenCountsOpenAI()` function.
