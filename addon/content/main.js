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
    try {
      // Register a tab with Zotero.Tab
      this.tabID = Zotero.Tab.register({
        title: 'LLM Assistant',
        src: this.rootURI + 'content/sidebar.html',
        visible: true,
        onLoad: function() {
          Zotero.log("LLM Assistant tab loaded");
        }
      });
      
      Zotero.log("LLM Assistant side panel registered with tabID: " + this.tabID);
    } catch (e) {
      Zotero.log("Error creating side panel: " + e);
    }
  }
};

// Initialize with rootURI passed from bootstrap context
if (typeof rootURI !== 'undefined') {
  LLMAssistant.init(rootURI);
}


