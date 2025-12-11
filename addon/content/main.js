/**
 * Main module for Zotero LLM Assistant
 * Item pane section implementation
 */

Zotero.log("Zotero LLM Assistant: Main module loaded");

// Helper functions to get current provider and model name
function getCurrentProvider() {
  if (typeof getProvider === 'function') {
    return getProvider();
  }
  return 'openai'; // Default
}

function getCurrentModelName() {
  const provider = getCurrentProvider();
  if (provider === 'claude') {
    if (typeof getSelectedClaudeModelName === 'function') {
      return getSelectedClaudeModelName();
    }
  } else {
    if (typeof getSelectedModelName === 'function') {
      return getSelectedModelName();
    }
  }
  return 'Assistant';
}

function getCurrentAPIKey() {
  const provider = getCurrentProvider();
  if (provider === 'claude') {
    if (typeof getClaudeAPIKey === 'function') {
      return getClaudeAPIKey();
    }
  } else {
    if (typeof getAPIKey === 'function') {
      return getAPIKey();
    }
  }
  return null;
}

async function callLLM(message, item, messageHistory, pdfText) {
  const provider = getCurrentProvider();
  if (provider === 'claude') {
    if (typeof callClaude === 'function') {
      return await callClaude(message, item, messageHistory, pdfText);
    } else {
      throw new Error('Claude API functions not available');
    }
  } else {
    if (typeof callOpenAI === 'function') {
      return await callOpenAI(message, item, messageHistory, pdfText);
    } else {
      throw new Error('OpenAI API functions not available');
    }
  }
}

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
          label: 'LLM Assistant',
          icon: this.rootURI + "icons/llm-assistant.svg"
        },
        sidenav: {
          l10nID: 'zotero-llm-assistant-sidenav',
          label: 'LLM Assistant',
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
          
          // Add event delegation for link clicks and text selection
          messagesArea.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href) {
              e.preventDefault();
              e.stopPropagation();
              try {
                // Use Zotero's URL opening mechanism
                const ios = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);
                const uri = ios.newURI(link.href, null, null);
                const extProc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
                  .getService(Components.interfaces.nsIExternalProtocolService);
                extProc.loadURI(uri);
                Zotero.log("Opening link: " + link.href);
              } catch (err) {
                Zotero.log("Error opening link: " + err + " - " + link.href);
              }
              return false;
            }
          }, true);
          
          // Check API key status
          const apiKey = getCurrentAPIKey();
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
              const modelName = getCurrentModelName();
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
            const provider = getCurrentProvider();
            const providerName = provider === 'claude' ? 'Claude' : 'OpenAI';
            messagesArea.textContent = `⚠️ Please configure your ${providerName} API key using the settings button (⚙️) to start chatting.`;
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
            const currentProvider = getCurrentProvider();
            const openaiKey = typeof getAPIKey === 'function' ? (getAPIKey() || '') : '';
            const claudeKey = typeof getClaudeAPIKey === 'function' ? (getClaudeAPIKey() || '') : '';
            const selectedOpenAIModel = typeof getSelectedModel === 'function' ? getSelectedModel() : 'gpt-5.1';
            const selectedClaudeModel = typeof getSelectedClaudeModel === 'function' ? getSelectedClaudeModel() : 'claude-sonnet-4-20250514';
            const reasoningConfig = typeof getReasoningConfig === 'function' ? getReasoningConfig() : null;
            const maxOutputTokens = typeof getMaxOutputTokens === 'function' ? getMaxOutputTokens() : 10000;
            const claudeMaxTokens = typeof getClaudeMaxTokens === 'function' ? getClaudeMaxTokens() : 4096;
            const temperature = typeof getTemperature === 'function' ? getTemperature() : 0.6;
            
            // Create a simple input dialog
            const inputDialog = body.ownerDocument.createElement('div');
            inputDialog.className = 'llm-dialog';
            
            // Provider selection
            const providerLabel = body.ownerDocument.createElement('label');
            providerLabel.className = 'llm-dialog-label';
            providerLabel.textContent = 'Provider:';
            
            const providerSelect = body.ownerDocument.createElement('select');
            providerSelect.className = 'llm-dialog-select';
            providerSelect.id = 'llm-provider-select';
            
            const openaiOption = body.ownerDocument.createElement('option');
            openaiOption.value = 'openai';
            openaiOption.textContent = 'OpenAI';
            if (currentProvider === 'openai') {
              openaiOption.selected = true;
            }
            providerSelect.appendChild(openaiOption);
            
            const claudeOption = body.ownerDocument.createElement('option');
            claudeOption.value = 'claude';
            claudeOption.textContent = 'Anthropic Claude';
            if (currentProvider === 'claude') {
              claudeOption.selected = true;
            }
            providerSelect.appendChild(claudeOption);
            
            // OpenAI API Key
            const openaiKeyLabel = body.ownerDocument.createElement('label');
            openaiKeyLabel.className = 'llm-dialog-label';
            openaiKeyLabel.textContent = 'OpenAI API Key:';
            openaiKeyLabel.id = 'llm-openai-key-label';
            
            const openaiKeyInput = body.ownerDocument.createElement('input');
            openaiKeyInput.type = 'password';
            openaiKeyInput.className = 'llm-dialog-input';
            openaiKeyInput.value = openaiKey;
            openaiKeyInput.id = 'llm-openai-key-input';
            
            // Claude API Key
            const claudeKeyLabel = body.ownerDocument.createElement('label');
            claudeKeyLabel.className = 'llm-dialog-label';
            claudeKeyLabel.textContent = 'Claude API Key:';
            claudeKeyLabel.id = 'llm-claude-key-label';
            claudeKeyLabel.style.display = currentProvider === 'claude' ? 'block' : 'none';
            
            const claudeKeyInput = body.ownerDocument.createElement('input');
            claudeKeyInput.type = 'password';
            claudeKeyInput.className = 'llm-dialog-input';
            claudeKeyInput.value = claudeKey;
            claudeKeyInput.id = 'llm-claude-key-input';
            claudeKeyInput.style.display = currentProvider === 'claude' ? 'block' : 'none';
            
            // OpenAI Model selection
            const openaiModelLabel = body.ownerDocument.createElement('label');
            openaiModelLabel.className = 'llm-dialog-label';
            openaiModelLabel.textContent = 'GPT Model:';
            openaiModelLabel.id = 'llm-openai-model-label';
            
            const openaiModelSelect = body.ownerDocument.createElement('select');
            openaiModelSelect.className = 'llm-dialog-select';
            openaiModelSelect.id = 'llm-openai-model-select';
            
            // Populate OpenAI model options
            if (typeof AVAILABLE_MODELS !== 'undefined') {
              AVAILABLE_MODELS.forEach(model => {
                const option = body.ownerDocument.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (model.id === selectedOpenAIModel) {
                  option.selected = true;
                }
                openaiModelSelect.appendChild(option);
              });
            }
            
            // Claude Model selection
            const claudeModelLabel = body.ownerDocument.createElement('label');
            claudeModelLabel.className = 'llm-dialog-label';
            claudeModelLabel.textContent = 'Claude Model:';
            claudeModelLabel.id = 'llm-claude-model-label';
            claudeModelLabel.style.display = currentProvider === 'claude' ? 'block' : 'none';
            
            const claudeModelSelect = body.ownerDocument.createElement('select');
            claudeModelSelect.className = 'llm-dialog-select';
            claudeModelSelect.id = 'llm-claude-model-select';
            claudeModelSelect.style.display = currentProvider === 'claude' ? 'block' : 'none';
            
            // Populate Claude model options
            if (typeof AVAILABLE_CLAUDE_MODELS !== 'undefined') {
              AVAILABLE_CLAUDE_MODELS.forEach(model => {
                const option = body.ownerDocument.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (model.id === selectedClaudeModel) {
                  option.selected = true;
                }
                claudeModelSelect.appendChild(option);
              });
            }
            
            // Max tokens control (different labels for OpenAI vs Claude)
            const maxTokensLabel = body.ownerDocument.createElement('label');
            maxTokensLabel.className = 'llm-dialog-label';
            maxTokensLabel.textContent = 'Max Output Tokens:';
            maxTokensLabel.id = 'llm-max-tokens-label';
            
            const maxTokensInput = body.ownerDocument.createElement('input');
            maxTokensInput.type = 'number';
            maxTokensInput.className = 'llm-dialog-input';
            maxTokensInput.id = 'llm-max-tokens-input';
            maxTokensInput.min = 1;
            maxTokensInput.placeholder = currentProvider === 'claude' ? '4096' : '10000';
            maxTokensInput.value = currentProvider === 'claude' ? claudeMaxTokens : maxOutputTokens;
            
            // Update max tokens label and value when provider changes
            const updateMaxTokensLabel = () => {
              const selectedProvider = providerSelect.value;
              if (selectedProvider === 'claude') {
                maxTokensLabel.textContent = 'Max Tokens:';
                maxTokensInput.placeholder = '4096';
                maxTokensInput.value = claudeMaxTokens;
              } else {
                maxTokensLabel.textContent = 'Max Output Tokens:';
                maxTokensInput.placeholder = '10000';
                maxTokensInput.value = maxOutputTokens;
              }
            };
            
            // Update UI when provider changes
            providerSelect.addEventListener('change', () => {
              const selectedProvider = providerSelect.value;
              if (selectedProvider === 'claude') {
                openaiKeyLabel.style.display = 'none';
                openaiKeyInput.style.display = 'none';
                openaiModelLabel.style.display = 'none';
                openaiModelSelect.style.display = 'none';
                claudeKeyLabel.style.display = 'block';
                claudeKeyInput.style.display = 'block';
                claudeModelLabel.style.display = 'block';
                claudeModelSelect.style.display = 'block';
                reasoningContainer.style.display = 'none';
              } else {
                openaiKeyLabel.style.display = 'block';
                openaiKeyInput.style.display = 'block';
                openaiModelLabel.style.display = 'block';
                openaiModelSelect.style.display = 'block';
                claudeKeyLabel.style.display = 'none';
                claudeKeyInput.style.display = 'none';
                claudeModelLabel.style.display = 'none';
                claudeModelSelect.style.display = 'none';
                reasoningContainer.style.display = 'block';
              }
              updateMaxTokensLabel();
            });
            
            // Reasoning controls (OpenAI only)
            const reasoningContainer = body.ownerDocument.createElement('div');
            reasoningContainer.id = 'llm-reasoning-container';
            reasoningContainer.style.display = currentProvider === 'openai' ? 'block' : 'none';
            
            // Reasoning effort control
            const reasoningEffortLabel = body.ownerDocument.createElement('label');
            reasoningEffortLabel.className = 'llm-dialog-label';
            reasoningEffortLabel.textContent = 'Reasoning Effort:';
            
            const reasoningEffortSelect = body.ownerDocument.createElement('select');
            reasoningEffortSelect.className = 'llm-dialog-select';
            
            const effortOptions = [
              { value: 'none', text: 'Disabled (None)' },
              { value: 'low', text: 'Low' },
              { value: 'medium', text: 'Medium' },
              { value: 'high', text: 'High' }
            ];
            
            effortOptions.forEach(opt => {
              const option = body.ownerDocument.createElement('option');
              option.value = opt.value;
              option.textContent = opt.text;
              const currentEffort = reasoningConfig?.effort || 'none';
              if (currentEffort === opt.value) {
                option.selected = true;
              }
              reasoningEffortSelect.appendChild(option);
            });
            
            // Reasoning summary control
            const reasoningSummaryLabel = body.ownerDocument.createElement('label');
            reasoningSummaryLabel.className = 'llm-dialog-label';
            reasoningSummaryLabel.textContent = 'Reasoning Summary:';
            
            const reasoningSummarySelect = body.ownerDocument.createElement('select');
            reasoningSummarySelect.className = 'llm-dialog-select';
            
            const summaryOptions = [
              { value: 'none', text: 'Disabled' },
              { value: 'auto', text: 'Auto' },
              { value: 'concise', text: 'Concise' },
              { value: 'detailed', text: 'Detailed' }
            ];
            
            summaryOptions.forEach(opt => {
              const option = body.ownerDocument.createElement('option');
              option.value = opt.value;
              option.textContent = opt.text;
              if ((reasoningConfig && reasoningConfig.summary === opt.value) || (!reasoningConfig && opt.value === 'none')) {
                option.selected = true;
              }
              reasoningSummarySelect.appendChild(option);
            });
            
            
            // Temperature control
            const temperatureLabel = body.ownerDocument.createElement('label');
            temperatureLabel.className = 'llm-dialog-label';
            temperatureLabel.textContent = 'Temperature:';
            
            const temperatureInput = body.ownerDocument.createElement('input');
            temperatureInput.type = 'number';
            temperatureInput.className = 'llm-dialog-input';
            temperatureInput.value = temperature;
            temperatureInput.min = 0;
            temperatureInput.max = 2;
            temperatureInput.step = 0.1;
            temperatureInput.placeholder = '0.6';
            
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
              const selectedProvider = providerSelect.value;
              let allSaved = true;
              
              // Save provider
              if (typeof setProvider === 'function') {
                allSaved = setProvider(selectedProvider) && allSaved;
              }
              
              // Save provider-specific settings
              if (selectedProvider === 'claude') {
                if (typeof setClaudeAPIKey === 'function') {
                  allSaved = setClaudeAPIKey(claudeKeyInput.value) && allSaved;
                }
                if (typeof setSelectedClaudeModel === 'function') {
                  allSaved = setSelectedClaudeModel(claudeModelSelect.value) && allSaved;
                }
                if (typeof setClaudeMaxTokens === 'function') {
                  allSaved = setClaudeMaxTokens(parseInt(maxTokensInput.value, 10)) && allSaved;
                }
              } else {
                if (typeof setAPIKey === 'function') {
                  allSaved = setAPIKey(openaiKeyInput.value) && allSaved;
                }
                if (typeof setSelectedModel === 'function') {
                  allSaved = setSelectedModel(openaiModelSelect.value) && allSaved;
                }
                if (typeof setReasoningEffort === 'function') {
                  allSaved = setReasoningEffort(reasoningEffortSelect.value) && allSaved;
                }
                if (typeof setReasoningSummary === 'function') {
                  allSaved = setReasoningSummary(reasoningSummarySelect.value) && allSaved;
                }
                if (typeof setMaxOutputTokens === 'function') {
                  allSaved = setMaxOutputTokens(parseInt(maxTokensInput.value, 10)) && allSaved;
                }
              }
              
              // Save temperature (shared)
              if (typeof setTemperature === 'function') {
                allSaved = setTemperature(parseFloat(temperatureInput.value)) && allSaved;
              }
              
              if (allSaved) {
                Zotero.log('Settings saved successfully');
                closeDialog();
                // Refresh the messages area to show updated status
                const apiKey = getCurrentAPIKey();
                if (apiKey) {
                  messagesArea.textContent = 'Welcome! Ask me about this item.';
                } else {
                  const provider = getCurrentProvider();
                  const providerName = provider === 'claude' ? 'Claude' : 'OpenAI';
                  messagesArea.textContent = `⚠️ Please configure your ${providerName} API key using the settings button (⚙️) to start chatting.`;
                }
              } else {
                Zotero.log('Failed to save settings');
                alert('Failed to save settings. Please try again.');
              }
            });
            
            cancelBtn.addEventListener('click', closeDialog);
            
            // Append all elements to dialog
            inputDialog.appendChild(providerLabel);
            inputDialog.appendChild(providerSelect);
            inputDialog.appendChild(openaiKeyLabel);
            inputDialog.appendChild(openaiKeyInput);
            inputDialog.appendChild(claudeKeyLabel);
            inputDialog.appendChild(claudeKeyInput);
            inputDialog.appendChild(openaiModelLabel);
            inputDialog.appendChild(openaiModelSelect);
            inputDialog.appendChild(claudeModelLabel);
            inputDialog.appendChild(claudeModelSelect);
            reasoningContainer.appendChild(reasoningEffortLabel);
            reasoningContainer.appendChild(reasoningEffortSelect);
            reasoningContainer.appendChild(reasoningSummaryLabel);
            reasoningContainer.appendChild(reasoningSummarySelect);
            inputDialog.appendChild(reasoningContainer);
            inputDialog.appendChild(maxTokensLabel);
            inputDialog.appendChild(maxTokensInput);
            inputDialog.appendChild(temperatureLabel);
            inputDialog.appendChild(temperatureInput);
            buttonArea.appendChild(saveBtn);
            buttonArea.appendChild(cancelBtn);
            inputDialog.appendChild(buttonArea);
            
            body.appendChild(inputDialog);
            // Focus on the appropriate input based on provider
            if (currentProvider === 'claude') {
              claudeKeyInput.focus();
            } else {
              openaiKeyInput.focus();
            }
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
            const modelName = getCurrentModelName();
            
            // Add loading message
            const loadingMsg = body.ownerDocument.createElement('div');
            loadingMsg.className = 'llm-message llm-message-assistant';
            loadingMsg.textContent = modelName + ': Typing...';
            messagesArea.appendChild(loadingMsg);
            
            try {
              // Get PDF text for this item (from cache or extract)
              const pdfText = await getPDFTextForItem(item, this.pdfTextCache);
              
              // Call LLM API (OpenAI or Claude) with message history and PDF text
              const response = await callLLM(message, item, history.slice(0, -1), pdfText); // Pass history without current message
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


