/**
 * Anthropic Claude API module for Zotero LLM Assistant
 * Handles API configuration and communication with Anthropic Claude
 */

// Anthropic Claude API configuration
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_COUNT_TOKENS_URL = 'https://api.anthropic.com/v1/messages/count_tokens';

// Available Claude models with their max PDF text length (in characters)
// Based on context window sizes for Claude models
// Using ~60% of context window for PDF text, leaving room for system messages, user messages, and responses
// 1 token ≈ 4 characters for English text
const AVAILABLE_CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Latest Sonnet model', maxPDFLength: 800000 },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable Claude model (requires Pro/Max/Team/Enterprise)', maxPDFLength: 800000 }
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

// Get Claude API key from Zotero preferences
function getClaudeAPIKey() {
  const key = getPref("extensions.zotero-llm-assistant.claude-api-key");
  if (key) {
    Zotero.log("Claude API key loaded from preferences");
  } else {
    Zotero.log("No Claude API key found in preferences");
  }
  return key;
}

// Set Claude API key in Zotero preferences
function setClaudeAPIKey(key) {
  const success = setPref("extensions.zotero-llm-assistant.claude-api-key", key);
  if (success) {
    Zotero.log("Claude API key saved to preferences successfully");
  }
  return success;
}

// Get selected Claude model from Zotero preferences
// Default to Claude Sonnet 4
function getSelectedClaudeModel() {
  const model = getPref("extensions.zotero-llm-assistant.selected-claude-model", 'claude-sonnet-4-20250514');
  Zotero.log(`Selected Claude model: ${model}`);
  return model;
}

// Set selected Claude model in Zotero preferences
function setSelectedClaudeModel(model) {
  const success = setPref("extensions.zotero-llm-assistant.selected-claude-model", model);
  if (success) {
    Zotero.log(`Selected Claude model saved: ${model}`);
  }
  return success;
}

// Get the display name for the selected Claude model
function getSelectedClaudeModelName() {
  const selectedModel = getSelectedClaudeModel();
  const model = AVAILABLE_CLAUDE_MODELS.find(m => m.id === selectedModel);
  return model ? model.name : selectedModel;
}

// Get the max PDF length for the selected Claude model
function getSelectedClaudeModelMaxPDFLength() {
  const selectedModel = getSelectedClaudeModel();
  const model = AVAILABLE_CLAUDE_MODELS.find(m => m.id === selectedModel);
  return model?.maxPDFLength || 800000; // Default to 800k if not found
}

// Get max tokens from preferences (Claude uses max_tokens instead of max_output_tokens)
function getClaudeMaxTokens() {
  const tokens = getPref("extensions.zotero-llm-assistant.claude-max-tokens");
  return tokens ? parseInt(tokens, 10) : 4096; // Default to 4k for Claude
}

// Set max tokens preference
function setClaudeMaxTokens(tokens) {
  const success = setPref("extensions.zotero-llm-assistant.claude-max-tokens", 
    tokens && tokens > 0 ? tokens.toString() : null);
  if (success) {
    Zotero.log(`Claude max tokens preference saved: ${tokens || "default"}`);
  }
  return success;
}

// Get temperature from preferences (shared with OpenAI)
function getClaudeTemperature() {
  const temp = getPref("extensions.zotero-llm-assistant.temperature");
  return temp ? parseFloat(temp) : 0.6; // Default to 0.6
}

// Set temperature preference (shared with OpenAI)
function setClaudeTemperature(temperature) {
  const success = setPref("extensions.zotero-llm-assistant.temperature", 
    temperature !== null && temperature !== undefined ? temperature.toString() : null);
  if (success) {
    Zotero.log(`Temperature preference saved: ${temperature || "default"}`);
  }
  return success;
}


// Function to call Claude API
async function callClaude(message, item, messageHistory = [], pdfText = null) {
  const apiKey = getClaudeAPIKey();
  if (!apiKey) {
    throw new Error('Claude API key not configured. Please set it in Zotero preferences.');
  }
  
  const selectedModel = getSelectedClaudeModel();
  
  // Prepare context about the item
  const itemContext = `Item: ${item.getField('title') || 'Untitled'}
Type: ${item.itemType}
Authors: ${item.getCreators().map(c => c.lastName + ', ' + c.firstName).join('; ')}
Year: ${item.getField('date') || 'Unknown'}`;
  
  // Build system message with item context
  let systemContent = `You are helping analyze a Zotero reference item. Here's the item information:

${itemContext}`;
  
  // Include PDF/HTML text if available
  if (pdfText) {
    const maxPDFLength = getSelectedClaudeModelMaxPDFLength();
    const pdfContent = pdfText.length > maxPDFLength 
      ? pdfText.substring(pdfText.length - maxPDFLength) + '\n\n[Note: PDF text truncated - showing last portion]'
      : pdfText;
    
    if (pdfText.length > maxPDFLength) {
      Zotero.log(`PDF/HTML text truncated from ${pdfText.length} to ${maxPDFLength} characters for model ${selectedModel}`);
    }
    
    systemContent += `\n\nThe following is the full text content from PDF/HTML attachments associated with this item:\n\n${pdfContent}`;
  }
  
  systemContent += '\n\nPlease provide helpful responses about this item.';
  
  // Build messages array - Claude uses messages array with user/assistant roles
  // Convert message history to Claude format (Claude doesn't use system role in messages array)
  const messages = [];
  
  // Add message history (convert from OpenAI format if needed)
  messageHistory.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      });
    }
  });
  
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
  }, 0) + systemContent.length;
  
  const maxContextLength = getSelectedClaudeModelMaxPDFLength();
  const contextUsagePercent = Math.round((totalMessageLength / maxContextLength) * 100);
  
  Zotero.log(`Context usage for ${selectedModel}: ${totalMessageLength.toLocaleString()} / ${maxContextLength.toLocaleString()} characters (${contextUsagePercent}%)`);

  // Get configurable parameters
  const maxTokens = getClaudeMaxTokens();
  const temperature = getClaudeTemperature();
  
  const requestBody = {
    model: selectedModel,
    messages: messages,
    system: systemContent,
    max_tokens: maxTokens,
    temperature: temperature,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5
      }
    ]
  };
  
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01' // Required header for Anthropic API
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API request failed: ${response.status} ${response.statusText}. Model: ${selectedModel}. Error: ${errorText}`;
    
    // If model not found, suggest trying a different model
    if (response.status === 404) {
      errorMessage += '\n\nNote: This model may not be available with your API key. Try selecting a different Claude model from the settings.';
      Zotero.log(`Model ${selectedModel} not found. Available models: ${AVAILABLE_CLAUDE_MODELS.map(m => m.id).join(', ')}`);
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  // Check if response was truncated
  if (data.stop_reason === 'max_tokens') {
    Zotero.log(`Warning: Claude response was truncated due to max_tokens limit (${maxTokens}). Consider increasing max_tokens.`);
  }
  
  // Claude API response structure: content is an array of text blocks
  if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
    Zotero.log("Unexpected response structure: " + JSON.stringify(data));
    throw new Error("Unexpected API response structure - no content array");
  }
  
  // Extract and concatenate all text blocks from content array
  // There can be multiple text blocks, especially with tool use
  const textBlocks = data.content.filter(item => item.type === 'text');
  if (textBlocks.length === 0) {
    Zotero.log("No text content found in response: " + JSON.stringify(data));
    throw new Error("No text content found in API response");
  }
  
  // Concatenate all text blocks
  const content = textBlocks.map(block => block.text).join('');
  
  if (data.stop_reason === 'max_tokens') {
    Zotero.log(`Response was truncated. Full length: ${content.length} characters`);
  }
  
  return content;
}


// Function to get token counts for text using Claude's count_tokens API
// This endpoint does not consume quota and only returns token counts
async function getTokenCountsClaude(text) {
  const apiKey = getClaudeAPIKey();
  if (!apiKey) {
    throw new Error('Claude API key not configured');
  }
  
  const selectedModel = getSelectedClaudeModel();
  
  // Prepare messages array with the text
  const messages = [{
    role: 'user',
    content: text
  }];
  
  const requestBody = {
    model: selectedModel,
    messages: messages
  };
  
  try {
    const response = await fetch(ANTHROPIC_COUNT_TOKENS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01' // Required header for Anthropic API
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      Zotero.log(`Claude count_tokens API error: ${response.status} ${response.statusText}. ${errorText}`);
      throw new Error(`Token counting failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Claude count_tokens API returns: { "input_tokens": <number> }
    if (data.input_tokens !== undefined) {
      return {
        input_tokens: data.input_tokens,
        estimated: false
      };
    }
    
    throw new Error("Unexpected response structure from count_tokens API");
  } catch (e) {
    Zotero.log("Error getting token counts from Claude API: " + e);
    throw e; // Re-throw to let caller handle
  }
}
