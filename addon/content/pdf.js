/**
 * PDF and HTML reading module for Zotero LLM Assistant
 * Handles PDF and HTML attachment detection and text extraction
 */

// Get PDF and HTML attachments for an item
function getPDFAttachments(item) {
  try {
    const attachments = item.getAttachments();
    const pdfAttachments = [];
    
    for (const attachmentID of attachments) {
      const attachment = Zotero.Items.get(attachmentID);
      if (attachment && attachment.isAttachment()) {
        const contentType = attachment.attachmentContentType || '';
        const filename = attachment.getFilename() || '';
        const lowerFilename = filename.toLowerCase();
        
        // Check if it's a PDF or HTML file
        const isPDF = contentType === 'application/pdf' || lowerFilename.endsWith('.pdf');
        const isHTML = contentType === 'text/html' || 
                       contentType === 'application/xhtml+xml' || 
                       lowerFilename.endsWith('.html') || 
                       lowerFilename.endsWith('.htm');
        
        if (isPDF || isHTML) {
          pdfAttachments.push(attachment);
        }
      }
    }
    
    // Build log message with item name and attachment names
    const itemTitle = item.getField('title') || 'Untitled';
    const attachmentNames = pdfAttachments.map(att => att.getFilename() || 'Unknown').join(', ');
    Zotero.log(`Found ${pdfAttachments.length} PDF/HTML attachment(s) for item "${itemTitle}" (ID: ${item.id}): ${attachmentNames}`);
    return pdfAttachments;
  } catch (e) {
    Zotero.log("Error getting PDF/HTML attachments: " + e);
    return [];
  }
}

// Extract text from a PDF or HTML file
async function extractPDFText(attachment) {
  try {
    const itemID = attachment.id;
    const filename = attachment.getFilename() || '';
    const fileType = filename.toLowerCase().endsWith('.html') || filename.toLowerCase().endsWith('.htm') ? 'HTML' : 'PDF';
    
    // Use attachmentText property - this works for both PDF and HTML files
    const text = await attachment.attachmentText;
    
    if (text) {
      Zotero.log(`Successfully extracted text from ${fileType} ${itemID} (${text.length} chars)`);
      return text;
    }
    
    Zotero.log(`No content found for ${fileType} ${itemID}`);
    return null;
    
  } catch (e) {
    Zotero.log(`Error extracting text from attachment ${attachment.id}: ${e.message}\n${e.stack}`);
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
    Zotero.log(`No PDF/HTML attachments found for item ${itemID}`);
    pdfTextCache.set(itemID, null);
    return null;
  }
  
  // Extract text from all PDF and HTML attachments
  let allText = '';
  for (const attachment of pdfAttachments) {
    const text = await extractPDFText(attachment);
    if (text) {
      const filename = attachment.getFilename() || 'Unknown';
      allText += `\n\n--- ${filename} ---\n\n${text}\n\n`;
    }
  }
  
  const result = allText.trim() || null;
  pdfTextCache.set(itemID, result);
  
  if (result) {
    Zotero.log(`Extracted ${result.length} characters of text from PDF/HTML attachments for item ${itemID}`);
  } else {
    Zotero.log(`Could not extract text from PDF/HTML attachments for item ${itemID}`);
  }
  
  return result;
}