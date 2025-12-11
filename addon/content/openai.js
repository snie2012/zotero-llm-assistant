/**
 * OpenAI API module for Zotero LLM Assistant
 * Handles API configuration and communication with OpenAI
 */

// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

// Available GPT models with their max PDF text length (in characters)
// Based on context window sizes: GPT-4 (8k tokens), GPT-4 Turbo (128k tokens), GPT-4o (200k tokens)
// Using ~60% of context window for PDF text, leaving room for system messages, user messages, and responses
// 1 token ≈ 4 characters for English text
const AVAILABLE_MODELS = [
  // GPT-5 Series (Latest) - Estimated large context windows (if/when available)
  { id: 'gpt-5', name: 'GPT-5', description: 'Flagship model, excels in coding and complex tasks', maxPDFLength: 600000 },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Smaller, faster variant with lower latency', maxPDFLength: 400000 },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Compact version, minimal resource usage', maxPDFLength: 200000 },
  
  // GPT-4 Series
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model with multimodal support (200k tokens)', maxPDFLength: 480000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective (128k tokens)', maxPDFLength: 300000 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast GPT-4 with longer context (128k tokens)', maxPDFLength: 300000 },
  { id: 'gpt-4', name: 'GPT-4', description: 'High-quality responses (8k tokens)', maxPDFLength: 20000 }
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

// Get the display name for the selected model
function getSelectedModelName() {
  const selectedModel = getSelectedModel();
  const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
  return model ? model.name : selectedModel;
}

// Get the max PDF length for the selected model
function getSelectedModelMaxPDFLength() {
  const selectedModel = getSelectedModel();
  const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
  return model && model.maxPDFLength ? model.maxPDFLength : 100000; // Default to 100k if not found
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
  
  // Always add system message with item context
  let systemContent = `You are helping analyze a Zotero reference item. Here's the item information:

${itemContext}`;
  
  // Include PDF/HTML text if available
  if (pdfText) {
    const maxPDFLength = getSelectedModelMaxPDFLength();
    const pdfContent = pdfText.length > maxPDFLength 
      ? pdfText.substring(pdfText.length - maxPDFLength) + '\n\n[Note: PDF text truncated - showing last portion]'
      : pdfText;
    
    if (pdfText.length > maxPDFLength) {
      Zotero.log(`PDF/HTML text truncated from ${pdfText.length} to ${maxPDFLength} characters for model ${selectedModel}`);
    }
    
    systemContent += `\n\nThe following is the full text content from PDF/HTML attachments associated with this item:\n\n${pdfContent}`;
  }
  
  systemContent += '\n\nPlease provide helpful responses about this item.';
  
  messages.push({
    role: 'system',
    content: systemContent
  });
  
  // Add message history
  messages.push(...messageHistory);
  
  // Add current user message
  messages.push({
    role: 'user',
    content: message
  });
  
  // Calculate and log context usage for entire message history
  const totalMessageLength = messages.reduce((total, msg) => {
    if (typeof msg.content === 'string') {
      return total + msg.content.length;
    }
    return total;
  }, 0);
  
  const maxContextLength = getSelectedModelMaxPDFLength();
  const contextUsagePercent = Math.round((totalMessageLength / maxContextLength) * 100);
  
  Zotero.log(`Context usage for ${selectedModel}: ${totalMessageLength.toLocaleString()} / ${maxContextLength.toLocaleString()} characters (${contextUsagePercent}%)`);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      input: messages,
      max_output_tokens: selectedModel.startsWith('gpt-5') ? 2000 : 500,
      ...(selectedModel.startsWith('gpt-5') ? {} : { temperature: 0.7 })
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText}. Model: ${selectedModel}. Error: ${errorText}`);
  }

  const data = await response.json();
//   Zotero.log("API Response data: " + JSON.stringify(data));
  
  // Responses API structure: output is an array, content is an array within output[0]
  if (!data.output || !data.output[0] || !data.output[0].content || !data.output[0].content[0]) {
    Zotero.log("Unexpected response structure: " + JSON.stringify(data));
    throw new Error("Unexpected API response structure");
  }
  
  // Find the output_text content item
  const outputTextContent = data.output[0].content.find(item => item.type === "output_text");
  if (!outputTextContent || !outputTextContent.text) {
    Zotero.log("No output_text found in response: " + JSON.stringify(data));
    throw new Error("No output text found in API response");
  }
  
  const content = outputTextContent.text;
//   Zotero.log("Extracted content: " + content);
  
  return content;
}

