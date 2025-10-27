/**
 * Main module for Zotero LLM Assistant
 * Side panel implementation using Zotero.Tab
 */

Zotero.log("Zotero LLM Assistant: Main module loaded");

const LLMAssistant = {
  rootURI: null,
  tabID: null,
  
  init: function(rootURI) {
    this.rootURI = rootURI;
    Zotero.log("Zotero LLM Assistant initialized with rootURI: " + rootURI);
    
    // Create the side panel
    this.createSidePanel();
  },
  
  createSidePanel: function() {
    // Add menu item to open LLM Assistant
    this.addMenuItem();
  },
  
  addMenuItem: function() {
    try {
      // Add to Tools menu
      var menu = document.getElementById('menu_Tools');
      if (menu) {
        var menuitem = document.createElement('menuitem');
        menuitem.setAttribute('id', 'zotero-llm-assistant-menu');
        menuitem.setAttribute('label', 'LLM Assistant...');
        menuitem.addEventListener('command', () => this.openLLMPanel());
        menu.appendChild(menuitem);
        Zotero.log("LLM Assistant menu item added");
      }
    } catch (e) {
      Zotero.log("Error adding menu item: " + e);
    }
  },
  
  openLLMPanel: function() {
    Zotero.log("Opening LLM Assistant panel");
    // For now, just log - we'll implement the actual panel next
    alert("LLM Assistant: Side panel will open here");
  }
};

// Initialize with rootURI passed from bootstrap context
if (typeof rootURI !== 'undefined') {
  LLMAssistant.init(rootURI);
}


