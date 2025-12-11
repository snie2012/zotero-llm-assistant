/**
 * OpenAI API module for Zotero LLM Assistant
 * Handles API configuration and communication with OpenAI
 */

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
async function callOpenAI(message, item, messageHistory = [], pdfText = null) {
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
  
  // Build messages array with system message, history, and current message
  const messages = [];
  
  // Add system message with item context (only if no history exists)
  if (messageHistory.length === 0) {
    let systemContent = `You are helping analyze a Zotero reference item. Here's the item information:

${itemContext}`;
    
    // Add PDF content if available
    if (pdfText) {
      // Truncate PDF text if too long (keep last ~100k characters to stay within token limits)
      const maxPDFLength = 100000;
      const pdfContent = pdfText.length > maxPDFLength 
        ? pdfText.substring(pdfText.length - maxPDFLength) + '\n\n[Note: PDF text truncated - showing last portion]'
        : pdfText;
      
      systemContent += `\n\nThe following is the full text content from PDF attachments associated with this item:\n\n${pdfContent}`;
    } else {
      const pdfAttachments = getPDFAttachments(item);
      if (pdfAttachments.length > 0) {
        systemContent += `\n\nNote: This item has ${pdfAttachments.length} PDF attachment(s), but the text could not be automatically extracted. You can still answer questions about the item metadata.`;
      }
    }
    
    systemContent += '\n\nPlease provide helpful responses about this item.';
    
    messages.push({
      role: 'system',
      content: systemContent
    });
  }
  
  // Add message history
  messages.push(...messageHistory);
  
  // Add current user message
  messages.push({
    role: 'user',
    content: message
  });

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: messages,
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

