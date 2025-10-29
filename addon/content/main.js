/**
 * Main module for Zotero LLM Assistant
 * Item pane section implementation
 */

Zotero.log("Zotero LLM Assistant: Main module loaded");

// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Get API key from Zotero preferences
function getAPIKey() {
  try {
    // Try to get from Zotero preferences first
    const prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    return prefBranch.getCharPref("extensions.zotero-llm-assistant.openai-api-key");
  } catch (e) {
    // Fallback to environment variable or prompt user
    return null;
  }
}

// Set API key in Zotero preferences
function setAPIKey(key) {
  try {
    const prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    prefBranch.setCharPref("extensions.zotero-llm-assistant.openai-api-key", key);
    return true;
  } catch (e) {
    Zotero.log("Error setting API key: " + e);
    return false;
  }
}

// Function to call OpenAI API
async function callOpenAI(message, item) {
  const apiKey = getAPIKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set it in Zotero preferences.');
  }
  
  // Prepare context about the item
  const itemContext = `Item: ${item.getField('title') || 'Untitled'}
Type: ${item.itemType}
Authors: ${item.getCreators().map(c => c.lastName + ', ' + c.firstName).join('; ')}
Year: ${item.getField('date') || 'Unknown'}`;
  
  const prompt = `You are helping analyze a Zotero reference item. Here's the item information:

${itemContext}

User question: ${message}

Please provide a helpful response about this item.`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

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
           
           // Create chat UI
           const container = body.ownerDocument.createElement('div');
           container.style.cssText = 'display: flex; flex-direction: column; height: 100%;';
           
           // Messages area
           const messagesArea = body.ownerDocument.createElement('div');
           messagesArea.id = 'llm-messages';
           messagesArea.style.cssText = 'flex: 1; overflow-y: auto; padding: 10px; border: 1px solid #ccc; margin-bottom: 10px;';
           messagesArea.textContent = 'Welcome! Ask me about this item.';
           
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
             
             // Create a simple input dialog
             const inputDialog = body.ownerDocument.createElement('div');
             inputDialog.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 2px solid #ccc; padding: 20px; z-index: 1000;';
             
             const label = body.ownerDocument.createElement('label');
             label.textContent = 'OpenAI API Key:';
             label.style.cssText = 'display: block; margin-bottom: 10px;';
             
             const input = body.ownerDocument.createElement('input');
             input.type = 'password';
             input.value = apiKey;
             input.style.cssText = 'width: 300px; padding: 5px; margin-bottom: 10px;';
             
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
               if (setAPIKey(input.value)) {
                 Zotero.log('API key saved successfully');
                 closeDialog();
               } else {
                 Zotero.log('Failed to save API key');
               }
             });
             
             cancelBtn.addEventListener('click', closeDialog);
             
             inputDialog.appendChild(label);
             inputDialog.appendChild(input);
             buttonArea.appendChild(saveBtn);
             buttonArea.appendChild(cancelBtn);
             inputDialog.appendChild(buttonArea);
             
             body.appendChild(inputDialog);
             input.focus();
           };
           
           settingsBtn.addEventListener('click', showSettings);
           
           // Event handlers
           const sendMessage = async () => {
             const message = input.value.trim();
             if (!message) return;
             
             // Add user message
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
               // Call OpenAI API
               const response = await callOpenAI(message, item);
               loadingMsg.textContent = 'Assistant: ' + response;
             } catch (e) {
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


