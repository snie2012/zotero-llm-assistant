/**
 * Main module for Zotero LLM Assistant
 * Item pane section implementation
 */

Zotero.log("Zotero LLM Assistant: Main module loaded");

const LLMAssistant = {
  rootURI: null,
  
  init: function(rootURI) {
    this.rootURI = rootURI;
    Zotero.log("Zotero LLM Assistant initialized with rootURI: " + rootURI);
    
    // Add a section to the item pane (like abstract/notes)
    this.addItemPaneSection();
  },
  
  addItemPaneSection: function() {
    try {
      var self = this;
      
      // Register a custom section in the item pane
      Zotero.ItemPaneManager.registerSection({
        paneID: 'llm-assistant',
        sectionName: 'LLM Assistant',
        onRender: function(container, data) {
          // Render the LLM assistant UI
          var html = `
            <div style="padding: 10px;">
              <h3 style="margin-top: 0; font-size: 14px;">LLM Assistant</h3>
              <p style="color: #666;">Interact with ChatGPT, Claude, and other LLMs</p>
              <button onclick="alert('LLM Assistant coming soon!')">Start Chat</button>
            </div>
          `;
          container.innerHTML = html;
        },
        order: 999  // Add at the end, after notes
      });
      
      Zotero.log("LLM Assistant section added to item pane");
    } catch (e) {
      Zotero.log("Error adding section: " + e);
    }
  }
};

// Make globally accessible if needed
Zotero.LLMAssistant = LLMAssistant;

// Initialize with rootURI passed from bootstrap context
if (typeof rootURI !== 'undefined') {
  LLMAssistant.init(rootURI);
}


