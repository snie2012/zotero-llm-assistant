/**
 * Main module for Zotero LLM Assistant
 * Item pane section implementation
 */

Zotero.log("Zotero LLM Assistant: Main module loaded");

// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Available GPT models
const AVAILABLE_MODELS = [
  // GPT-5 Series (Latest)
  { id: 'gpt-5', name: 'GPT-5', description: 'Flagship model, excels in coding and complex tasks' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Smaller, faster variant with lower latency' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Compact version, minimal resource usage' },
  
  // GPT-4 Series
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model with multimodal support' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast GPT-4 with longer context' },
  { id: 'gpt-4', name: 'GPT-4', description: 'High-quality responses' },
  
  // GPT-3.5 Series
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and affordable' },
  { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k', description: 'Longer context window' }
];

// Get API key from Zotero preferences
function getAPIKey() {
  try {
    const prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    
    // Check if preference exists first
    if (prefBranch.prefHasUserValue("extensions.zotero-llm-assistant.openai-api-key")) {
      const key = prefBranch.getCharPref("extensions.zotero-llm-assistant.openai-api-key");
      Zotero.log("API key loaded from preferences");
      return key;
    } else {
      Zotero.log("No API key found in preferences");
      return null;
    }
  } catch (e) {
    Zotero.log("Error getting API key: " + e);
    return null;
  }
}

// Set API key in Zotero preferences
function setAPIKey(key) {
  try {
    const prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    
    prefBranch.setCharPref("extensions.zotero-llm-assistant.openai-api-key", key);
    Zotero.log("API key saved to preferences successfully");
    return true;
  } catch (e) {
    Zotero.log("Error setting API key: " + e);
    return false;
  }
}

// Get selected model from Zotero preferences
function getSelectedModel() {
  try {
    const prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    
    if (prefBranch.prefHasUserValue("extensions.zotero-llm-assistant.selected-model")) {
      const model = prefBranch.getCharPref("extensions.zotero-llm-assistant.selected-model");
      Zotero.log("Selected model loaded from preferences: " + model);
      return model;
    } else {
      Zotero.log("No model preference found, using default: gpt-5");
      return 'gpt-5'; // Default model
    }
  } catch (e) {
    Zotero.log("Error getting selected model: " + e);
    return 'gpt-5';
  }
}

// Set selected model in Zotero preferences
function setSelectedModel(model) {
  try {
    const prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    
    prefBranch.setCharPref("extensions.zotero-llm-assistant.selected-model", model);
    Zotero.log("Selected model saved to preferences: " + model);
    return true;
  } catch (e) {
    Zotero.log("Error setting selected model: " + e);
    return false;
  }
}

// Function to call OpenAI API
async function callOpenAI(message, item) {
  const apiKey = getAPIKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set it in Zotero preferences.');
  }
  
  const selectedModel = getSelectedModel();
  
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
      model: selectedModel,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: selectedModel.startsWith('gpt-5') ? 2000 : 500,
      ...(selectedModel.startsWith('gpt-5') ? {} : { temperature: 0.7 })
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText}. Model: ${selectedModel}. Error: ${errorText}`);
  }

  const data = await response.json();
  Zotero.log("API Response data: " + JSON.stringify(data));
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    Zotero.log("Unexpected response structure: " + JSON.stringify(data));
    throw new Error("Unexpected API response structure");
  }
  
  const content = data.choices[0].message.content;
  Zotero.log("Extracted content: " + content);
  
  return content;
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
           
           // Check API key status
           const apiKey = getAPIKey();
           if (apiKey) {
             messagesArea.textContent = 'Welcome! Ask me about this item.';
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


