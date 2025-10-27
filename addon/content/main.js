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
          label: 'LLM Assistant'
        },
        headericon: 'chrome://zotero/skin/16/universal/search.svg',
        headerl10nID: 'zotero-llm-assistant-header',
        
        // Sidenav configuration
        sidenav: {
          icon: 'chrome://zotero/skin/16/universal/search.svg',
          l10nID: 'zotero-llm-assistant-sidenav',
          label: 'LLM Assistant'
        },
        
        // Show for regular items, not notes or attachments
        onInit: ({ item, editable, tabType }) => {
          return item && !item.isNote() && !item.isAttachment();
        },
        
        // Render the section content
        onRender: ({ body, item, editable, tabType }) => {
          // Load content from sidebar.html
          body.innerHTML = '';
          
          if (!item) {
            const div = document.createElement('div');
            div.textContent = 'No item selected';
            body.appendChild(div);
            return;
          }
          
          // Fetch and load the sidebar.html content
          var self = this;
          fetch(self.rootURI + 'content/sidebar.html')
            .then(response => response.text())
            .then(html => {
              // Parse the HTML and extract the body content
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              const content = doc.querySelector('body').innerHTML;
              body.innerHTML = content;
              
              // Hook up button click to log item info
              const btn = body.querySelector('#start-chat-btn');
              if (btn) {
                btn.addEventListener('click', () => {
                  Zotero.log("LLM Assistant: Start Chat clicked for item " + item.id);
                });
              }
            })
            .catch(err => {
              Zotero.log("Error loading sidebar.html: " + err);
              body.innerHTML = '<div style="padding: 10px;">Error loading LLM Assistant</div>';
            });
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


