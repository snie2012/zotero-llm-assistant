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
      Zotero.ItemPaneManager.registerSection({
        // Unique identifier for this section
        paneID: this.sectionID,
        
        // Plugin ID
        pluginID: this.pluginID,
        
        // Display header for the section
        header: {
          l10nID: 'zotero-llm-assistant-header',
          icon: 'chrome://zotero/skin/16/universal/search.svg',
          label: 'LLM Assistant'
        },
        
        // Header icon (optional)
        // headericon: 'chrome://zotero/skin/16/universal/search.svg',
        
        // Show for regular items, not notes or attachments
        onInit: ({ item, editable, tabType }) => {
          return item && !item.isNote() && !item.isAttachment();
        },
        
        // Render the section content
        onRender: ({ body, item, editable, tabType }) => {
          // Clear previous content
          body.innerHTML = '';
          
          // Create container
          const container = document.createElement('div');
          container.style.padding = '10px';
          container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
          
          if (!item) {
            container.textContent = 'No item selected';
            body.appendChild(container);
            return;
          }
          
          // Create header
          const header = document.createElement('h3');
          header.textContent = 'LLM Assistant';
          header.style.marginTop = '0';
          header.style.marginBottom = '10px';
          header.style.fontSize = '14px';
          container.appendChild(header);
          
          // Create description
          const desc = document.createElement('p');
          desc.textContent = 'Interact with ChatGPT, Claude, and other LLMs';
          desc.style.color = '#666';
          desc.style.marginBottom = '15px';
          container.appendChild(desc);
          
          // Create button
          const button = document.createElement('button');
          button.textContent = 'Start Chat';
          button.style.padding = '6px 12px';
          button.style.fontSize = '13px';
          button.style.cursor = 'pointer';
          button.onclick = () => {
            Zotero.log("LLM Assistant: Start Chat clicked for item " + item.id);
            alert('LLM Assistant coming soon!');
          };
          container.appendChild(button);
          
          body.appendChild(container);
        },
        
        // Called when item changes
        onItemChange: ({ item, setEnabled }) => {
          if (item && (item.isNote() || item.isAttachment())) {
            setEnabled(false);
          } else {
            setEnabled(true);
          }
        },
        
        // Cleanup
        onDestroy: () => {
          Zotero.log('LLM Assistant section destroyed');
        }
      });
      
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


