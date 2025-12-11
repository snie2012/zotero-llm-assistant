/**
 * PDF reading module for Zotero LLM Assistant
 * Handles PDF attachment detection and text extraction
 */

// Get PDF attachments for an item
function getPDFAttachments(item) {
  try {
    const attachments = item.getAttachments();
    const pdfAttachments = [];
    
    for (const attachmentID of attachments) {
      const attachment = Zotero.Items.get(attachmentID);
      if (attachment && attachment.isAttachment()) {
        const contentType = attachment.attachmentContentType || '';
        const filename = attachment.getFilename() || '';
        
        // Check if it's a PDF
        if (contentType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
          pdfAttachments.push(attachment);
        }
      }
    }
    
    Zotero.log(`Found ${pdfAttachments.length} PDF attachment(s) for item ${item.id}`);
    return pdfAttachments;
  } catch (e) {
    Zotero.log("Error getting PDF attachments: " + e);
    return [];
  }
}

// Extract text from a PDF file
async function extractPDFText(attachment) {
  try {
    // Try to get full text using Zotero's Fulltext API
    try {
      const fulltext = await Zotero.Fulltext.getAsync(attachment.id);
      if (fulltext && fulltext.text) {
        Zotero.log(`Using pre-extracted text from Zotero for attachment ${attachment.id}`);
        return fulltext.text;
      }
    } catch (e) {
      Zotero.log("Fulltext.getAsync not available or failed: " + e);
    }
    
    // Alternative: Try using attachment's getFulltext method if available
    try {
      if (typeof attachment.getFulltext === 'function') {
        const fulltext = await attachment.getFulltext();
        if (fulltext && fulltext.text) {
          Zotero.log(`Using attachment.getFulltext() for attachment ${attachment.id}`);
          return fulltext.text;
        }
      }
    } catch (e) {
      Zotero.log("attachment.getFulltext() failed: " + e);
    }
    
    // If no pre-extracted text, try to get file path and read it
    let filePath;
    try {
      if (typeof attachment.getFilePathAsync === 'function') {
        filePath = await attachment.getFilePathAsync();
      } else if (typeof attachment.getFilePath === 'function') {
        filePath = attachment.getFilePath();
      }
    } catch (e) {
      Zotero.log("Error getting file path: " + e);
    }
    
    if (!filePath) {
      Zotero.log(`No file path available for attachment ${attachment.id}`);
      return null;
    }
    
    // Check if file exists
    const file = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(filePath);
    
    if (!file.exists()) {
      Zotero.log(`PDF file does not exist: ${filePath}`);
      return null;
    }
    
    Zotero.log(`PDF file found at: ${filePath}, but text extraction not available`);
    
    // For now, return null if we can't extract text
    // In the future, we could integrate pdf.js or another PDF parsing library
    return null;
  } catch (e) {
    Zotero.log("Error extracting PDF text: " + e);
    return null;
  }
}

// Get PDF text for an item (with caching)
async function getPDFTextForItem(item, pdfTextCache) {
  const itemID = item.id;
  
  // Check cache first
  if (pdfTextCache.has(itemID)) {
    Zotero.log(`Using cached PDF text for item ${itemID}`);
    return pdfTextCache.get(itemID);
  }
  
  const pdfAttachments = getPDFAttachments(item);
  if (pdfAttachments.length === 0) {
    pdfTextCache.set(itemID, null);
    return null;
  }
  
  // Extract text from all PDF attachments
  let allText = '';
  for (const attachment of pdfAttachments) {
    const text = await extractPDFText(attachment);
    if (text) {
      allText += `\n\n--- PDF: ${attachment.getFilename()} ---\n\n${text}\n\n`;
    }
  }
  
  const result = allText.trim() || null;
  pdfTextCache.set(itemID, result);
  
  if (result) {
    Zotero.log(`Extracted ${result.length} characters of PDF text for item ${itemID}`);
  } else {
    Zotero.log(`Could not extract PDF text for item ${itemID}`);
  }
  
  return result;
}

