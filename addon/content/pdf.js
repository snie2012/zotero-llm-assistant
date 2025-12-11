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
    const itemID = attachment.id;
    
    // Use attachmentText property - this is the correct Zotero API
    const text = await attachment.attachmentText;
    
    if (text) {
      Zotero.log(`Successfully extracted text from PDF ${itemID} (${text.length} chars)`);
      return text;
    }
    
    Zotero.log(`No content found for PDF ${itemID}`);
    return null;
    
  } catch (e) {
    Zotero.log(`Error extracting PDF text for ${attachment.id}: ${e.message}\n${e.stack}`);
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
    Zotero.log(`No PDF attachments found for item ${itemID}`);
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