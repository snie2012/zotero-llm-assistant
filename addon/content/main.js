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
           container.style.cssText = 'display: flex; flex-direction: column; height: 100%;';
           
           // Messages area
           const messagesArea = body.ownerDocument.createElement('div');
           messagesArea.id = 'llm-messages';
           messagesArea.style.cssText = 'flex: 1; overflow-y: auto; padding: 10px; border: 1px solid #ccc; margin-bottom: 10px;';
           
           // Check API key status
           const apiKey = getAPIKey();
           if (apiKey) {
             if (history.length === 0) {
               // Check for PDF attachments
               const pdfAttachments = getPDFAttachments(item);
               let welcomeMsg = 'Welcome! Ask me about this item.';
               if (pdfAttachments.length > 0) {
                 welcomeMsg += `\n\n📄 Found ${pdfAttachments.length} PDF attachment(s). Extracting text...`;
               }
               messagesArea.textContent = welcomeMsg;
               
               // Load PDF text in background
               getPDFTextForItem(item, this.pdfTextCache).then(pdfText => {
                 if (pdfText) {
                   // Update welcome message if still showing
                   if (messagesArea.textContent.includes('Extracting text')) {
                     messagesArea.textContent = `Welcome! Ask me about this item.\n\n📄 PDF text loaded (${Math.round(pdfText.length / 1000)}k characters). You can ask questions about the PDF content.`;
                   }
                 } else if (pdfAttachments.length > 0) {
                   // Update message if extraction failed
                   if (messagesArea.textContent.includes('Extracting text')) {
                     messagesArea.textContent = `Welcome! Ask me about this item.\n\n⚠️ PDF attachment(s) found but text extraction was not successful. You can still ask about the item metadata.`;
                   }
                 }
               }).catch(e => {
                 Zotero.log("Error loading PDF text: " + e);
               });
             } else {
               // Restore previous messages
               history.forEach(msg => {
                 const msgDiv = body.ownerDocument.createElement('div');
                 msgDiv.style.cssText = 'margin-bottom: 10px; padding: 5px; background: ' + 
                   (msg.role === 'user' ? '#f0f0f0' : '#e0e0e0') + ';';
                 msgDiv.textContent = (msg.role === 'user' ? 'You: ' : 'Assistant: ') + msg.content;
                 messagesArea.appendChild(msgDiv);
               });
             }
           } else {
             messagesArea.textContent = '⚠️ Please configure your OpenAI API key using the settings button (⚙️) to start chatting.';
           }
           
           // Input area
           const inputArea = body.ownerDocument.createElement('div');
           inputArea.style.cssText = 'display: flex; gap: 5px; margin-bottom: 5px;';
           
           const input = body.ownerDocument.createElement('input');
           input.type = 'text';
           input.placeholder = 'Ask about this item...';
           input.style.cssText = 'flex: 1; padding: 5px;';
           
           const sendBtn = body.ownerDocument.createElement('button');
           sendBtn.textContent = 'Send';
           sendBtn.style.cssText = 'padding: 5px 10px;';
           
           // Settings button
           const settingsBtn = body.ownerDocument.createElement('button');
           settingsBtn.textContent = '⚙️';
           settingsBtn.title = 'Settings';
           settingsBtn.style.cssText = 'padding: 5px; margin-right: 5px;';
           
           // Settings dialog
           const showSettings = () => {
             const apiKey = getAPIKey() || '';
             const selectedModel = getSelectedModel();
             
             // Create a simple input dialog
             const inputDialog = body.ownerDocument.createElement('div');
             inputDialog.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 2px solid #ccc; padding: 20px; z-index: 1000; width: 400px;';
             
             const apiKeyLabel = body.ownerDocument.createElement('label');
             apiKeyLabel.textContent = 'OpenAI API Key:';
             apiKeyLabel.style.cssText = 'display: block; margin-bottom: 10px;';
             
             const apiKeyInput = body.ownerDocument.createElement('input');
             apiKeyInput.type = 'password';
             apiKeyInput.value = apiKey;
             apiKeyInput.style.cssText = 'width: 100%; padding: 5px; margin-bottom: 15px;';
             
             const modelLabel = body.ownerDocument.createElement('label');
             modelLabel.textContent = 'GPT Model:';
             modelLabel.style.cssText = 'display: block; margin-bottom: 10px;';
             
             const modelSelect = body.ownerDocument.createElement('select');
             modelSelect.style.cssText = 'width: 100%; padding: 5px; margin-bottom: 15px;';
             
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
             buttonArea.style.cssText = 'text-align: right;';
             
             const saveBtn = body.ownerDocument.createElement('button');
             saveBtn.textContent = 'Save';
             saveBtn.style.cssText = 'margin-right: 10px; padding: 5px 10px;';
             
             const cancelBtn = body.ownerDocument.createElement('button');
             cancelBtn.textContent = 'Cancel';
             cancelBtn.style.cssText = 'padding: 5px 10px;';
             
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
             
             // Add user message to UI
             const userMsg = body.ownerDocument.createElement('div');
             userMsg.style.cssText = 'margin-bottom: 10px; padding: 5px; background: #f0f0f0;';
             userMsg.textContent = 'You: ' + message;
             messagesArea.appendChild(userMsg);
             
             // Clear input
             input.value = '';
             
             // Add loading message
             const loadingMsg = body.ownerDocument.createElement('div');
             loadingMsg.style.cssText = 'margin-bottom: 10px; padding: 5px; background: #e0e0e0;';
             loadingMsg.textContent = 'Assistant: Thinking...';
             messagesArea.appendChild(loadingMsg);
             
             try {
               // Get PDF text for this item (from cache or extract)
               const pdfText = await getPDFTextForItem(item, this.pdfTextCache);
               
               // Call OpenAI API with message history and PDF text
               const response = await callOpenAI(message, item, history.slice(0, -1), pdfText); // Pass history without current message
               const assistantMessage = { role: 'assistant', content: response };
               history.push(assistantMessage);
               loadingMsg.textContent = 'Assistant: ' + response;
             } catch (e) {
               // Remove user message from history on error
               history.pop();
               loadingMsg.textContent = 'Assistant: Error - ' + e.message;
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


