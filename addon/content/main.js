/**
 * Main module for Zotero LLM Assistant
 * Item pane section implementation
 */

Zotero.log("Zotero LLM Assistant: Main module loaded");

class LLMAssistantSection {
  constructor(rootURI) {
    this.rootURI = rootURI;
    this.sectionID = 'llm-assistant-section';
    this.pluginID = 'zotero-llm-assistant@snie2012.com';
  }

  // Initialize the section
  init() {
    try {
      Zotero.log("Registering LLM Assistant section...");
      const config = {
        paneID: this.sectionID,
        pluginID: this.pluginID,
        header: {
          l10nID: 'zotero-llm-assistant-header',
          icon: this.rootURI + "icons/llm-assistant.svg"
        },
        sidenav: {
          l10nID: 'zotero-llm-assistant-sidenav',
          icon: this.rootURI + "icons/llm-assistant.svg"
        },
        onInit: ({ item, editable, tabType }) => {
          return item && !item.isNote() && !item.isAttachment();
        },
        onRender: ({ body, item, editable, tabType }) => {
          body.innerHTML = '';
          if (!item) {
            body.textContent = 'No item selected';
            return;
          }
          
          const div = body.ownerDocument.createElement('div');
          div.textContent = 'LLM Assistant - Coming soon';
          body.appendChild(div);
        },
        onItemChange: ({ item, setEnabled }) => {
          setEnabled(!item || (!item.isNote() && !item.isAttachment()));
        },
        onDestroy: () => {
          Zotero.log('LLM Assistant section destroyed');
        }
      };
      
      Zotero.ItemPaneManager.registerSection(config);
      Zotero.log("LLM Assistant section registered successfully");
    } catch (e) {
      Zotero.log("Error registering section: " + e);
    }
  }
  
  // Unregister the section
  unregister() {
    Zotero.ItemPaneManager.unregisterSection(this.sectionID);
  }
}

// Initialize section
var llmAssistantSection;
if (typeof rootURI !== 'undefined') {
  llmAssistantSection = new LLMAssistantSection(rootURI);
  llmAssistantSection.init();
  
  // Make accessible globally
  Zotero.LLMAssistant = {
    section: llmAssistantSection
  };
}


