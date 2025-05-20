// src/utils/documentConverter.ts
import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import pdf from 'pdf-parse';
import * as Tesseract from 'tesseract.js';

// Interface for our converter
interface DocumentConverter {
  convertToText(filePath: string): Promise<string>;
  convertToMarkdown(filePath: string): Promise<string>;
}

// PDF Converter
class PdfConverter implements DocumentConverter {
  async convertToText(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('Error converting PDF to text:', error);
      throw error;
    }
  }

  async convertToMarkdown(filePath: string): Promise<string> {
    // PDF doesn't have rich text features, so we'll just convert to text
    // and add some basic formatting
    const text = await this.convertToText(filePath);
    
    // Simple formatting: assume paragraphs are separated by double newlines
    const paragraphs = text.split(/\n\s*\n/);
    return paragraphs.map(p => p.trim()).join('\n\n');
  }
}

// DOCX Converter
class DocxConverter implements DocumentConverter {
  async convertToText(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('Error converting DOCX to text:', error);
      throw error;
    }
  }

  async convertToMarkdown(filePath: string): Promise<string> {
    try {
      // Extract HTML (with formatting) and convert it to Markdown
      const result = await mammoth.convertToHtml({ path: filePath });
      // Note: In a real app, you would convert HTML to Markdown here
      // We're using the HTML directly as a simplification
      return result.value;
    } catch (error) {
      console.error('Error converting DOCX to markdown:', error);
      throw error;
    }
  }
}

// Image Converter
class ImageConverter implements DocumentConverter {
  async convertToText(filePath: string): Promise<string> {
    try {
      const { data } = await Tesseract.recognize(filePath, 'eng');
      return data.text;
    } catch (error) {
      console.error('Error converting image to text:', error);
      throw error;
    }
  }

  async convertToMarkdown(filePath: string): Promise<string> {
    // Images don't have rich text features, so we'll just use the text
    const text = await this.convertToText(filePath);
    
    // Assuming paragraphs are separated by double newlines
    const paragraphs = text.split(/\n\s*\n/);
    return paragraphs.map(p => p.trim()).join('\n\n');
  }
}

// Factory for creating the appropriate converter
class ConverterFactory {
  static getConverter(filePath: string): DocumentConverter {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.pdf':
        return new PdfConverter();
      case '.docx':
      case '.doc':
        return new DocxConverter();
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.bmp':
      case '.tiff':
        return new ImageConverter();
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }
}

/**
 * Check if a file type is supported
 */
export function isSupportedFileType(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  const supportedExtensions = [
    '.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'
  ];
  
  return supportedExtensions.includes(extension);
}

// Main converter function
export async function convertDocument(
  filePath: string, 
  outputFormat: 'text' | 'markdown' = 'text'
): Promise<string> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    if (!isSupportedFileType(filePath)) {
      throw new Error(`Unsupported file type: ${path.extname(filePath)}`);
    }
    
    const converter = ConverterFactory.getConverter(filePath);
    
    if (outputFormat === 'text') {
      return await converter.convertToText(filePath);
    } else {
      return await converter.convertToMarkdown(filePath);
    }
  } catch (error) {
    console.error('Error in convertDocument:', error);
    throw error;
  }
}

// Other utility functions

/**
 * Get file information
 */
export function getFileInfo(filePath: string): { name: string; extension: string; mimeType: string } {
  const name = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase().substring(1);
  
  // Determine MIME type based on extension
  let mimeType = 'application/octet-stream'; // Default
  switch (extension) {
    case 'pdf':
      mimeType = 'application/pdf';
      break;
    case 'docx':
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      break;
    case 'doc':
      mimeType = 'application/msword';
      break;
    case 'jpg':
    case 'jpeg':
      mimeType = 'image/jpeg';
      break;
    case 'png':
      mimeType = 'image/png';
      break;
    case 'gif':
      mimeType = 'image/gif';
      break;
    case 'bmp':
      mimeType = 'image/bmp';
      break;
    case 'tiff':
      mimeType = 'image/tiff';
      break;
  }
  
  return { name, extension, mimeType };
}