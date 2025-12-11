/**
 * Main module for Zotero LLM Assistant
 * Item pane section implementation
 */

Zotero.log("Zotero LLM Assistant: Main module loaded");

const loadCSS = async (doc, rootURI) => {
  if (doc.getElementById('llm-assistant-styles')) return;
  
  try {
    // Convert chrome:// URL to file path
    const cssURI = rootURI + 'content/styles.css';
    const cssText = await Zotero.File.getContentsFromURLAsync(cssURI);
    
    const style = doc.createElement('style');
    style.id = 'llm-assistant-styles';
    style.textContent = cssText;
    (doc.head || doc.documentElement).appendChild(style);
  } catch (e) {
    Zotero.log("CSS load error: " + e);
  }
};

const loadMarked = async (doc, rootURI) => {
  // Check if marked is already loaded (it should be loaded in bootstrap.js)
  if (typeof marked !== 'undefined') {
    Zotero.log("Marked library already available");
    return;
  }
  
  // If not loaded in bootstrap, log an error
  const error = new Error("Marked library not loaded - it should be loaded in bootstrap.js");
  Zotero.log("Error: " + error.message);
  throw error;
};

// Convert void elements to XHTML format for Zotero's XML parser
const fixXHTML = (html) => {
  if (!html) return html;
  // Convert <br> to <br />, <hr> to <hr />, etc.
  return html.replace(/<br>/gi, '<br />')
             .replace(/<hr>/gi, '<hr />')
             .replace(/<img([^>]*?)>/gi, '<img$1 />')
             .replace(/<input([^>]*?)>/gi, '<input$1 />')
             .replace(/<meta([^>]*?)>/gi, '<meta$1 />')
             .replace(/<link([^>]*?)>/gi, '<link$1 />')
             .replace(/<area([^>]*?)>/gi, '<area$1 />')
             .replace(/<base([^>]*?)>/gi, '<base$1 />')
             .replace(/<col([^>]*?)>/gi, '<col$1 />')
             .replace(/<embed([^>]*?)>/gi, '<embed$1 />')
             .replace(/<source([^>]*?)>/gi, '<source$1 />')
             .replace(/<track([^>]*?)>/gi, '<track$1 />')
             .replace(/<wbr([^>]*?)>/gi, '<wbr$1 />');
};

const renderMarkdown = (text) => {
  if (typeof marked === 'undefined') {
    // Fallback to plain text if marked is not available
    return text;
  }
  try {
    // Temporarily replace math delimiters to protect them from markdown processing
    const mathPlaceholders = [];
    let processedText = text;
    
    // Protect display math $$...$$
    processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
      const placeholder = `MATHBLOCK${mathPlaceholders.length}MATHBLOCK`;
      mathPlaceholders.push('$$' + content + '$$');
      return placeholder;
    });
    
    // Protect inline math $...$ (but not $$)
    processedText = processedText.replace(/\$([^\$\n]+?)\$/g, (match, content) => {
      const placeholder = `MATHINLINE${mathPlaceholders.length}MATHINLINE`;
      mathPlaceholders.push('$' + content + '$');
      return placeholder;
    });
    
    // Parse markdown
    let html = marked.parse(processedText);
    
    // Restore math delimiters
    mathPlaceholders.forEach((math, index) => {
      if (math.startsWith('$$')) {
        html = html.replace(`MATHBLOCK${index}MATHBLOCK`, math);
      } else {
        html = html.replace(`MATHINLINE${index}MATHINLINE`, math);
      }
    });
    
    // Fix XHTML for Zotero's XML parser
    return fixXHTML(html);
  } catch (e) {
    Zotero.log("Error parsing markdown: " + e);
    return text;
  }
};

class LLMAssistantSection {
  constructor(rootURI) {
    this.rootURI = rootURI;
    this.sectionID = 'llm-assistant-section';
    this.pluginID = 'zotero-llm-assistant@snie2012.com';
    // Store message history per item (keyed by item ID)
    this.messageHistory = new Map();
    // Cache PDF text per item (keyed by item ID)
    this.pdfTextCache = new Map();
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
          
           // Load CSS and marked library from external files
           const doc = body.ownerDocument;
           loadCSS(doc, this.rootURI);
           loadMarked(doc, this.rootURI).catch(e => {
             Zotero.log("Marked library will not be available: " + e);
           });
          
          // Get or initialize message history for this item
          const itemID = item.id;
          if (!this.messageHistory.has(itemID)) {
            this.messageHistory.set(itemID, []);
          }
          const history = this.messageHistory.get(itemID);
          
          // Load PDF text if not already cached (async, won't block rendering)
          getPDFTextForItem(item, this.pdfTextCache).then(pdfText => {
            if (pdfText) {
              Zotero.log(`PDF text loaded for item ${itemID}: ${pdfText.length} characters`);
            } else {
              const pdfAttachments = getPDFAttachments(item);
              if (pdfAttachments.length > 0) {
                Zotero.log(`Item ${itemID} has ${pdfAttachments.length} PDF(s) but text extraction was not successful`);
              }
            }
          }).catch(e => {
            Zotero.log("Error loading PDF text: " + e);
          });
          
          // Create chat UI
          const container = body.ownerDocument.createElement('div');
          container.className = 'llm-container';
          
          // Messages area
          const messagesArea = body.ownerDocument.createElement('div');
          messagesArea.id = 'llm-messages';
          messagesArea.className = 'llm-messages';
          
          // Check API key status
          const apiKey = getAPIKey();
          if (apiKey) {
            if (history.length === 0) {
              // Check for PDF/HTML attachments
              const pdfAttachments = getPDFAttachments(item);
              let welcomeMsg = 'Welcome! Ask me about this item.';
              if (pdfAttachments.length > 0) {
                welcomeMsg += `\n\n📄 Found ${pdfAttachments.length} PDF/HTML attachment(s). Extracting text...`;
              }
              messagesArea.textContent = welcomeMsg;
              
              // Load PDF/HTML text in background
              getPDFTextForItem(item, this.pdfTextCache).then(pdfText => {
                if (pdfText) {
                  // Update welcome message if still showing
                  if (messagesArea.textContent.includes('Extracting text')) {
                    messagesArea.textContent = `Welcome! Ask me about this item.\n\n📄 PDF/HTML text loaded (${Math.round(pdfText.length / 1000)}k characters). You can ask questions about the content.`;
                  }
                } else if (pdfAttachments.length > 0) {
                  // Update message if extraction failed
                  if (messagesArea.textContent.includes('Extracting text')) {
                    messagesArea.textContent = `Welcome! Ask me about this item.\n\n⚠️ PDF/HTML attachment(s) found but text extraction was not successful. You can still ask about the item metadata.`;
                  }
                }
              }).catch(e => {
                Zotero.log("Error loading PDF/HTML text: " + e);
              });
            } else {
              // Restore previous messages
              const modelName = getSelectedModelName();
              history.forEach(msg => {
                const msgDiv = body.ownerDocument.createElement('div');
                msgDiv.className = 'llm-message ' + (msg.role === 'user' ? 'llm-message-user' : 'llm-message-assistant');
                if (msg.role === 'user') {
                  msgDiv.textContent = 'You: ' + msg.content;
                  messagesArea.appendChild(msgDiv);
                } else {
                  msgDiv.className += ' llm-markdown';
                  msgDiv.innerHTML = '<strong>' + modelName + ':</strong><div class="llm-markdown-content">' + renderMarkdown(msg.content) + '</div>';
                  messagesArea.appendChild(msgDiv);
                }
              });
            }
          } else {
            messagesArea.textContent = '⚠️ Please configure your OpenAI API key using the settings button (⚙️) to start chatting.';
          }
          
          // Input area
          const inputArea = body.ownerDocument.createElement('div');
          inputArea.className = 'llm-input-area';
          
          const input = body.ownerDocument.createElement('input');
          input.type = 'text';
          input.className = 'llm-input';
          input.placeholder = 'Ask about this item...';
          
          const sendBtn = body.ownerDocument.createElement('button');
          sendBtn.className = 'llm-button';
          sendBtn.textContent = 'Send';
          
          // Settings button
          const settingsBtn = body.ownerDocument.createElement('button');
          settingsBtn.className = 'llm-settings-button';
          settingsBtn.textContent = '⚙️';
          settingsBtn.title = 'Settings';
          
          // Settings dialog
          const showSettings = () => {
            const apiKey = getAPIKey() || '';
            const selectedModel = getSelectedModel();
            
            // Create a simple input dialog
            const inputDialog = body.ownerDocument.createElement('div');
            inputDialog.className = 'llm-dialog';
            
            const apiKeyLabel = body.ownerDocument.createElement('label');
            apiKeyLabel.className = 'llm-dialog-label';
            apiKeyLabel.textContent = 'OpenAI API Key:';
            
            const apiKeyInput = body.ownerDocument.createElement('input');
            apiKeyInput.type = 'password';
            apiKeyInput.className = 'llm-dialog-input';
            apiKeyInput.value = apiKey;
            
            const modelLabel = body.ownerDocument.createElement('label');
            modelLabel.className = 'llm-dialog-label';
            modelLabel.textContent = 'GPT Model:';
            
            const modelSelect = body.ownerDocument.createElement('select');
            modelSelect.className = 'llm-dialog-select';
            
            // Populate model options
            AVAILABLE_MODELS.forEach(model => {
              const option = body.ownerDocument.createElement('option');
              option.value = model.id;
              option.textContent = model.name;
              if (model.id === selectedModel) {
                option.selected = true;
              }
              modelSelect.appendChild(option);
            });
            
            const buttonArea = body.ownerDocument.createElement('div');
            buttonArea.className = 'llm-dialog-buttons';
            
            const saveBtn = body.ownerDocument.createElement('button');
            saveBtn.className = 'llm-dialog-button llm-dialog-button-save';
            saveBtn.textContent = 'Save';
            
            const cancelBtn = body.ownerDocument.createElement('button');
            cancelBtn.className = 'llm-dialog-button';
            cancelBtn.textContent = 'Cancel';
            
            const closeDialog = () => {
              inputDialog.remove();
            };
            
            saveBtn.addEventListener('click', () => {
              const apiKeySaved = setAPIKey(apiKeyInput.value);
              const modelSaved = setSelectedModel(modelSelect.value);
              
              if (apiKeySaved && modelSaved) {
                Zotero.log('Settings saved successfully');
                closeDialog();
                // Refresh the messages area to show updated status
                const apiKey = getAPIKey();
                if (apiKey) {
                  messagesArea.textContent = 'Welcome! Ask me about this item.';
                } else {
                  messagesArea.textContent = '⚠️ Please configure your OpenAI API key using the settings button (⚙️) to start chatting.';
                }
              } else {
                Zotero.log('Failed to save settings');
                alert('Failed to save settings. Please try again.');
              }
            });
            
            cancelBtn.addEventListener('click', closeDialog);
            
            inputDialog.appendChild(apiKeyLabel);
            inputDialog.appendChild(apiKeyInput);
            inputDialog.appendChild(modelLabel);
            inputDialog.appendChild(modelSelect);
            buttonArea.appendChild(saveBtn);
            buttonArea.appendChild(cancelBtn);
            inputDialog.appendChild(buttonArea);
            
            body.appendChild(inputDialog);
            apiKeyInput.focus();
          };
          
          settingsBtn.addEventListener('click', showSettings);
          
          // Event handlers
          const sendMessage = async () => {
            const message = input.value.trim();
            if (!message) return;
            
            // Add user message to history
            const userMessage = { role: 'user', content: message };
            history.push(userMessage);
            
            // Add user message to UI (plain text for user messages)
            const userMsg = body.ownerDocument.createElement('div');
            userMsg.className = 'llm-message llm-message-user';
            userMsg.textContent = 'You: ' + message;
            messagesArea.appendChild(userMsg);
            
            // Clear input
            input.value = '';
            
            // Get current model name
            const modelName = getSelectedModelName();
            
            // Add loading message
            const loadingMsg = body.ownerDocument.createElement('div');
            loadingMsg.className = 'llm-message llm-message-assistant';
            loadingMsg.textContent = modelName + ': Typing...';
            messagesArea.appendChild(loadingMsg);
            
            try {
              // Get PDF text for this item (from cache or extract)
              const pdfText = await getPDFTextForItem(item, this.pdfTextCache);
              
              // Call OpenAI API with message history and PDF text
              const response = await callOpenAI(message, item, history.slice(0, -1), pdfText); // Pass history without current message
              const assistantMessage = { role: 'assistant', content: response };
              history.push(assistantMessage);
              
              // Render markdown for assistant messages
              loadingMsg.className = 'llm-message llm-message-assistant llm-markdown';
              loadingMsg.innerHTML = '<strong>' + modelName + ':</strong><div class="llm-markdown-content">' + renderMarkdown(response) + '</div>';
            } catch (e) {
              // Remove user message from history on error
              history.pop();
              loadingMsg.textContent = modelName + ': Error - ' + e.message;
            }
            
            messagesArea.scrollTop = messagesArea.scrollHeight;
          };
          
          sendBtn.addEventListener('click', sendMessage);
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
          });
          
          inputArea.appendChild(settingsBtn);
          inputArea.appendChild(input);
          inputArea.appendChild(sendBtn);
          
          container.appendChild(messagesArea);
          container.appendChild(inputArea);
          body.appendChild(container);
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


