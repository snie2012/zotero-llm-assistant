/**
 * OpenAI API module for Zotero LLM Assistant
 * Handles API configuration and communication with OpenAI
 */

// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

// Available GPT models with their max PDF text length (in characters)
// Based on context window sizes for GPT-5 series
// Using ~60% of context window for PDF text, leaving room for system messages, user messages, and responses
// 1 token ≈ 4 characters for English text
const AVAILABLE_MODELS = [
  // GPT-5 Series
  { id: 'gpt-5', name: 'GPT-5', description: 'Flagship model, excels in coding and complex tasks', maxPDFLength: 600000 },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Smaller, faster variant with lower latency', maxPDFLength: 400000 },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Compact version, minimal resource usage', maxPDFLength: 200000 }
];

// Helper function to get preferences branch
function getPrefBranch() {
  return Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefBranch);
}

// Generic preference getter
function getPref(prefName, defaultValue = null) {
  try {
    const prefBranch = getPrefBranch();
    if (prefBranch.prefHasUserValue(prefName)) {
      return prefBranch.getCharPref(prefName);
    }
    return defaultValue;
  } catch (e) {
    Zotero.log(`Error getting preference ${prefName}: ${e}`);
    return defaultValue;
  }
}

// Generic preference setter
function setPref(prefName, value) {
  try {
    const prefBranch = getPrefBranch();
    if (value !== null && value !== undefined && value !== "") {
      prefBranch.setCharPref(prefName, value);
    } else {
      prefBranch.clearUserPref(prefName);
    }
    return true;
  } catch (e) {
    Zotero.log(`Error setting preference ${prefName}: ${e}`);
    return false;
  }
}

// Get API key from Zotero preferences
function getAPIKey() {
  const key = getPref("extensions.zotero-llm-assistant.openai-api-key");
  if (key) {
    Zotero.log("API key loaded from preferences");
  } else {
    Zotero.log("No API key found in preferences");
  }
  return key;
}

// Set API key in Zotero preferences
function setAPIKey(key) {
  const success = setPref("extensions.zotero-llm-assistant.openai-api-key", key);
  if (success) {
    Zotero.log("API key saved to preferences successfully");
  }
  return success;
}

// Get selected model from Zotero preferences
function getSelectedModel() {
  const model = getPref("extensions.zotero-llm-assistant.selected-model", 'gpt-5');
  Zotero.log(`Selected model: ${model}`);
  return model;
}

// Set selected model in Zotero preferences
function setSelectedModel(model) {
  const success = setPref("extensions.zotero-llm-assistant.selected-model", model);
  if (success) {
    Zotero.log(`Selected model saved: ${model}`);
  }
  return success;
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
  return model?.maxPDFLength || 100000; // Default to 100k if not found
}

// Get reasoning configuration from preferences
function getReasoningConfig() {
  const effort = getPref("extensions.zotero-llm-assistant.reasoning-effort");
  const summary = getPref("extensions.zotero-llm-assistant.reasoning-summary");
  
  const reasoning = {};
  if (effort && effort !== "none") reasoning.effort = effort;
  if (summary && summary !== "none") reasoning.summary = summary;
  
  return Object.keys(reasoning).length > 0 ? reasoning : null;
}

// Set reasoning effort preference
function setReasoningEffort(effort) {
  const success = setPref("extensions.zotero-llm-assistant.reasoning-effort", 
    effort && effort !== "none" ? effort : null);
  if (success) {
    Zotero.log(`Reasoning effort preference saved: ${effort || "disabled"}`);
  }
  return success;
}

// Set reasoning summary preference
function setReasoningSummary(summary) {
  const success = setPref("extensions.zotero-llm-assistant.reasoning-summary", 
    summary && summary !== "none" ? summary : null);
  if (success) {
    Zotero.log(`Reasoning summary preference saved: ${summary || "disabled"}`);
  }
  return success;
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

  // Get reasoning configuration if enabled
  const reasoningConfig = getReasoningConfig();
  
  const requestBody = {
    model: selectedModel,
    input: messages,
    max_output_tokens: 2000,
    temperature: 1
  };
  
  // Add reasoning parameter if configured
  if (reasoningConfig) {
    requestBody.reasoning = reasoningConfig;
  }
  
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText}. Model: ${selectedModel}. Error: ${errorText}`);
  }

  const data = await response.json();
//   Zotero.log("API Response data: " + JSON.stringify(data));
  
  // Responses API structure: output is an array that may contain reasoning objects and messages
  // We need to find the message object (type === "message") in the output array
  if (!data.output || !Array.isArray(data.output) || data.output.length === 0) {
    Zotero.log("Unexpected response structure: " + JSON.stringify(data));
    throw new Error("Unexpected API response structure - no output array");
  }
  
  // Find the message object in the output array (skip reasoning objects)
  const messageOutput = data.output.find(item => item.type === "message");
  if (!messageOutput || !messageOutput.content || !Array.isArray(messageOutput.content)) {
    Zotero.log("No message found in output: " + JSON.stringify(data));
    throw new Error("No message found in API response");
  }
  
  // Find the output_text content item within the message
  const outputTextContent = messageOutput.content.find(item => item.type === "output_text");
  if (!outputTextContent || !outputTextContent.text) {
    Zotero.log("No output_text found in message content: " + JSON.stringify(data));
    throw new Error("No output text found in API response");
  }
  
  const content = outputTextContent.text;
//   Zotero.log("Extracted content: " + content);
  
  return content;
}

