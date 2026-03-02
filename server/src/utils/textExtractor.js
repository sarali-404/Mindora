const fs = require('fs');
const path = require('path');

// Text extraction utilities for different file types
// Uses pdf-parse for PDFs and mammoth for DOCX files

let pdfParse = null;
let mammoth = null;

// Lazy load dependencies to avoid startup errors if not installed
const loadPdfParse = async () => {
  if (!pdfParse) {
    try {
      pdfParse = require('pdf-parse');
    } catch (error) {
      console.error('pdf-parse not installed. Run: npm install pdf-parse');
      throw new Error('pdf-parse dependency not available');
    }
  }
  return pdfParse;
};

const loadMammoth = async () => {
  if (!mammoth) {
    try {
      mammoth = require('mammoth');
    } catch (error) {
      console.error('mammoth not installed. Run: npm install mammoth');
      throw new Error('mammoth dependency not available');
    }
  }
  return mammoth;
};

/**
 * Extract text from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @param {Object} options - Extraction options
 * @returns {Promise<{text: string, pageCount: number}>}
 */
async function extractFromPDF(filePath, options = {}) {
  const pdf = await loadPdfParse();
  
  const maxPages = options.maxPages || 50; // Default limit
  
  try {
    const dataBuffer = fs.readFileSync(filePath);
    
    // pdf-parse options
    const pdfOptions = {
      max: maxPages, // Limit pages to extract
    };
    
    const data = await pdf(dataBuffer, pdfOptions);
    
    // Clean up the extracted text
    let text = data.text || '';
    text = cleanExtractedText(text);
    
    return {
      text,
      pageCount: data.numpages,
      info: data.info
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text from a DOCX file
 * @param {string} filePath - Path to the DOCX file
 * @returns {Promise<{text: string}>}
 */
async function extractFromDOCX(filePath) {
  const mammothLib = await loadMammoth();
  
  try {
    const result = await mammothLib.extractRawText({ path: filePath });
    
    let text = result.value || '';
    text = cleanExtractedText(text);
    
    return {
      text,
      messages: result.messages // Any warnings from mammoth
    };
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

/**
 * Extract text from a plain text file
 * @param {string} filePath - Path to the text file
 * @returns {Promise<{text: string}>}
 */
async function extractFromTXT(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    return {
      text: cleanExtractedText(text)
    };
  } catch (error) {
    console.error('TXT extraction error:', error);
    throw new Error(`Failed to read text file: ${error.message}`);
  }
}

/**
 * Clean extracted text - remove excessive whitespace, fix formatting
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned text
 */
function cleanExtractedText(text) {
  if (!text) return '';
  
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive spaces
    .replace(/[ \t]{2,}/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Main extraction function - auto-detects file type
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @param {Object} options - Extraction options
 * @returns {Promise<{text: string, pageCount?: number}>}
 */
async function extractText(filePath, mimeType, options = {}) {
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Get file stats for size check
  const stats = fs.statSync(filePath);
  const maxSize = options.maxSizeMB || 10; // Default 10MB limit
  const fileSizeMB = stats.size / (1024 * 1024);
  
  if (fileSizeMB > maxSize) {
    throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB exceeds limit of ${maxSize}MB`);
  }
  
  // Determine extraction method based on MIME type or extension
  const ext = path.extname(filePath).toLowerCase();
  
  if (mimeType === 'application/pdf' || ext === '.pdf') {
    return extractFromPDF(filePath, options);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    return extractFromDOCX(filePath);
  } else if (
    mimeType === 'text/plain' ||
    ext === '.txt' ||
    ext === '.md'
  ) {
    return extractFromTXT(filePath);
  } else {
    throw new Error(`Unsupported file type: ${mimeType || ext}`);
  }
}

/**
 * Check if a file type is supported
 * @param {string} mimeType - MIME type to check
 * @returns {boolean}
 */
function isSupportedFileType(mimeType) {
  const supported = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  return supported.includes(mimeType);
}

/**
 * Get supported file extensions
 * @returns {string[]}
 */
function getSupportedExtensions() {
  return ['.pdf', '.docx', '.txt', '.md'];
}

/**
 * Truncate text to a maximum length while preserving word boundaries
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum character length
 * @returns {string}
 */
function truncateText(text, maxLength = 100000) {
  if (!text || text.length <= maxLength) return text;
  
  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Split text into chunks for processing (useful for large documents)
 * @param {string} text - Text to split
 * @param {number} chunkSize - Size of each chunk in characters
 * @param {number} overlap - Overlap between chunks
 * @returns {string[]}
 */
function splitIntoChunks(text, chunkSize = 10000, overlap = 500) {
  if (!text || text.length <= chunkSize) return [text];
  
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to end at a paragraph or sentence boundary
    if (end < text.length) {
      // Look for paragraph break
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + chunkSize * 0.7) {
        end = paragraphBreak;
      } else {
        // Look for sentence break
        const sentenceBreak = text.lastIndexOf('. ', end);
        if (sentenceBreak > start + chunkSize * 0.7) {
          end = sentenceBreak + 1;
        }
      }
    }
    
    chunks.push(text.substring(start, end).trim());
    start = end - overlap; // Overlap for context continuity
    
    if (start < 0) start = 0;
  }
  
  return chunks;
}

module.exports = {
  extractText,
  extractFromPDF,
  extractFromDOCX,
  extractFromTXT,
  cleanExtractedText,
  isSupportedFileType,
  getSupportedExtensions,
  truncateText,
  splitIntoChunks
};
