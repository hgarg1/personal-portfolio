const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

let cachedText = '';

async function loadResumeText() {
  if (cachedText) return cachedText;

  const pdfPath = path.join(__dirname, '../public/Harshit Garg -UMD.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.warn('⚠️ [ResumeService] PDF not found at:', pdfPath);
    return 'No resume file found.';
  }

  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    cachedText = result.text;
    console.log(`✅ [ResumeService] PDF parsed successfully (${cachedText.length} characters)`);
    return cachedText;
  } catch (err) {
    console.error('❌ [ResumeService] Error parsing PDF:', err);
    return 'Error reading resume details.';
  }
}

module.exports = {
  loadResumeText
};
