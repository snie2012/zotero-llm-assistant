/*
 * Bootstrap file for Zotero LLM Assistant
 * This file handles the plugin lifecycle events
 */

function install() {
  console.log("Installing Zotero LLM Assistant plugin");
}

function uninstall() {
  console.log("Uninstalling Zotero LLM Assistant plugin");
}

function startup({ id, version }) {
  console.log("Starting Zotero LLM Assistant plugin", { id, version });
  
  // Load the main module
  Services.scriptloader.loadSubScript(
    "chrome://zotero-llm-assistant/content/main.js"
  );
}

function shutdown({ id, reason }) {
  console.log("Shutting down Zotero LLM Assistant plugin", { id, reason });
}

