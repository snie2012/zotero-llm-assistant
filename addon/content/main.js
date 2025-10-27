/**
 * Main module for Zotero LLM Assistant
 * Side panel implementation - waiting for window load
 */

Zotero.log("Zotero LLM Assistant: Main module loaded");

const LLMAssistant = {
  rootURI: null,
  
  init: function(rootURI) {
    this.rootURI = rootURI;
    Zotero.log("Zotero LLM Assistant initialized with rootURI: " + rootURI);
    
    // Wait for Zotero UI to be ready
    this.waitForUI();
  },
  
  waitForUI: function() {
    // Use Services.obs to wait for window load
    var self = this;
    var observer = {
      observe: function(subject, topic, data) {
        if (topic === 'xul-window-registered') {
          self.setupMenuItem(subject);
        }
      }
    };
    
    Services.obs.addObserver(observer, 'xul-window-registered', false);
    
    // Also try immediately if already loaded
    setTimeout(() => self.trySetupMenuItem(), 1000);
  },
  
  trySetupMenuItem: function() {
    try {
      // Get the main window
      var window = Services.wm.getMostRecentWindow('navigator:browser');
      if (window && window.document) {
        this.addMenuItem(window.document);
      }
    } catch (e) {
      Zotero.log("Error in trySetupMenuItem: " + e);
    }
  },
  
  setupMenuItem: function(window) {
    if (window.document) {
      this.addMenuItem(window.document);
    }
  },
  
  addMenuItem: function(doc) {
    try {
      // Add to Tools menu
      var menu = doc.getElementById('menu_Tools');
      if (menu) {
        var menuitem = doc.createElement('menuitem');
        menuitem.setAttribute('id', 'zotero-llm-assistant-menu');
        menuitem.setAttribute('label', 'LLM Assistant...');
        menuitem.setAttribute('oncommand', 'Zotero.LLMAssistant.openPanel()');
        menu.appendChild(menuitem);
        Zotero.log("LLM Assistant menu item added");
      }
    } catch (e) {
      Zotero.log("Error adding menu item: " + e);
    }
  },
  
  openPanel: function() {
    Zotero.log("Opening LLM Assistant panel");
    alert("LLM Assistant: Panel will open here");
  }
};

// Make openPanel globally accessible
Zotero.LLMAssistant = LLMAssistant;

// Initialize with rootURI passed from bootstrap context
if (typeof rootURI !== 'undefined') {
  LLMAssistant.init(rootURI);
}


