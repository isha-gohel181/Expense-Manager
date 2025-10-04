const Tesseract = require('tesseract.js');
const sharp = require('sharp');

class OCRService {
  static async processReceipt(imagePath) {
    try {
      // Optimize image for OCR
      const processedImagePath = await this.preprocessImage(imagePath);
      
      const { data: { text, confidence } } = await Tesseract.recognize(
        processedImagePath,
        'eng',
        {
          logger: m => console.log(m)
        }
      );

      // Extract relevant information from OCR text
      const extractedData = this.extractExpenseData(text);
      
      return {
        extractedText: text,
        confidence: confidence,
        extractedData: extractedData,
        autoFilled: confidence > 70 // Auto-fill if confidence is high
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error('Failed to process receipt');
    }
  }

  static async preprocessImage(imagePath) {
    try {
      const processedPath = imagePath.replace(/\.[^/.]+$/, "_processed.jpg");
      
      await sharp(imagePath)
        .grayscale()
        .normalize()
        .sharpen()
        .jpeg({ quality: 95 })
        .toFile(processedPath);
        
      return processedPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  static extractExpenseData(text) {
    const extractedData = {
      amount: null,
      date: null,
      merchant: null,
      category: null
    };

    // Extract amount (look for lines with 'total', 'amount', etc. first for accuracy)
    const amountRegex = /(?:total|amount|due|balance)[\s:]*.*?([\$\£\€\¥\₹]?\s*\d+(?:,\d{3})*(?:\.\d{2}))/i;
    let amountMatch = text.match(amountRegex);
    if (amountMatch && amountMatch[1]) {
      extractedData.amount = parseFloat(amountMatch[1].replace(/[^\d.]/g, ''));
    } else {
      // Fallback to finding any currency value if total is not found
      const genericAmountRegex = /([\$\£\€\¥\₹]\s*\d+(?:,\d{3})*(?:\.\d{2})?)/;
      amountMatch = text.match(genericAmountRegex);
      if (amountMatch && amountMatch[1]) {
        extractedData.amount = parseFloat(amountMatch[1].replace(/[^\d.]/g, ''));
      }
    }

    // Improved date extraction
    const dateRegex = /(\d{1,2}[-/.\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/.\s]\d{2,4})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})|(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i;
    const dateMatch = text.match(dateRegex);
    if (dateMatch && dateMatch[0]) {
      // Attempt to create a valid date from the matched string
      const parsedDate = new Date(dateMatch[0].replace(/\s/g, '-'));
      if (!isNaN(parsedDate)) {
          extractedData.date = parsedDate;
      }
    }

    // Extract merchant name
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      extractedData.merchant = lines[0].trim();
    }

    // Categorize based on keywords
    const categoryKeywords = {
      'food': ['restaurant', 'cafe', 'food', 'dining', 'pizza', 'burger', 'bistro', 'lunch'],
      'travel': ['airline', 'flight', 'hotel', 'taxi', 'uber', 'lyft'],
      'office_supplies': ['office', 'supplies', 'staples', 'paper'],
      'transportation': ['gas', 'fuel', 'parking', 'metro', 'bus']
    };

    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        extractedData.category = category;
        break;
      }
    }

    return extractedData;
  }
}

module.exports = OCRService;