const express  = require('express');
const router   = express.Router();
const portfolio = require('../data/portfolio');
const sharp     = require('sharp');
const os        = require('os');
const fs        = require('fs');
const path      = require('path');

// Ensure fonts are downloaded and configured for sharp on Vercel / serverless envs
async function ensureFonts() {
  const fontDir = path.join(os.tmpdir(), 'portfolio-fonts');
  const boldFontPath = path.join(fontDir, 'LiberationSans-Bold.ttf');
  const regularFontPath = path.join(fontDir, 'LiberationSans-Regular.ttf');
  const confPath = path.join(fontDir, 'fonts.conf');
  
  if (!fs.existsSync(fontDir)) {
    fs.mkdirSync(fontDir, { recursive: true });
  }

  // 1. Download Bold Font
  if (!fs.existsSync(boldFontPath)) {
    try {
      const res = await fetch('https://unpkg.com/pdfjs-dist@2.16.105/standard_fonts/LiberationSans-Bold.ttf');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(boldFontPath, Buffer.from(buffer));
      console.log('✅ Bold font downloaded successfully.');
    } catch (err) {
      console.error('❌ Failed to download bold font:', err);
    }
  }

  // 2. Download Regular Font
  if (!fs.existsSync(regularFontPath)) {
    try {
      const res = await fetch('https://unpkg.com/pdfjs-dist@2.16.105/standard_fonts/LiberationSans-Regular.ttf');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(regularFontPath, Buffer.from(buffer));
      console.log('✅ Regular font downloaded successfully.');
    } catch (err) {
      console.error('❌ Failed to download regular font:', err);
    }
  }

  // 3. Write fonts.conf pointing to the temp directory
  if (!fs.existsSync(confPath)) {
    const fontDirFormatted = fontDir.replace(/\\/g, '/');
    const cacheDir = path.join(os.tmpdir(), 'portfolio-fonts-cache').replace(/\\/g, '/');
    const fontsConfContent = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontDirFormatted}</dir>
  <cachedir>${cacheDir}</cachedir>
  <config></config>
</fontconfig>`;
    fs.writeFileSync(confPath, fontsConfContent);
  }

  process.env.FONTCONFIG_PATH = fontDir;
}

router.get('/', (req, res) => {
  res.render('index', {
    title: `${portfolio.name} — AI Systems Architect & Full-Stack Engineer`,
    ...portfolio,
  });
});

// GET /api/og - Dynamically generate OG preview images based on page context
router.get('/api/og', async (req, res) => {
  try {
    // Warm up the fonts before sharp runs
    await ensureFonts();

    const title = req.query.title || 'Harshit Garg';
    const desc = req.query.desc || 'AI Systems Architect, Full-Stack Engineer, and Platform Builder.';

    // Word-wrap description for SVG tspans (max ~55 chars per line)
    const maxChars = 55;
    const words = desc.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length > maxChars) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    }
    if (currentLine) {
      lines.push(currentLine.trim());
    }
    
    // Take first 3 lines of description to prevent layout breaking
    const descLines = lines.slice(0, 3);
    const descTspans = descLines
      .map((line, i) => `<tspan x="120" dy="${i === 0 ? 0 : 35}">${escapeXml(line)}</tspan>`)
      .join('');

    // Handle Title wrap if title is too long (max ~28 chars per line)
    const titleMaxChars = 28;
    const titleWords = title.split(' ');
    const titleLines = [];
    let currentTitleLine = '';
    
    for (const word of titleWords) {
      if ((currentTitleLine + ' ' + word).length > titleMaxChars) {
        titleLines.push(currentTitleLine.trim());
        currentTitleLine = word;
      } else {
        currentTitleLine += (currentTitleLine ? ' ' : '') + word;
      }
    }
    if (currentTitleLine) {
      titleLines.push(currentTitleLine.trim());
    }

    const finalTitleLines = titleLines.slice(0, 2);
    const titleTspans = finalTitleLines
      .map((line, i) => `<tspan x="120" dy="${i === 0 ? 0 : 65}">${escapeXml(line)}</tspan>`)
      .join('');

    // Adjust description vertical offset depending on how many lines of title we have
    const descY = finalTitleLines.length > 1 ? 400 : 350;

    const svgString = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Dark Gradient -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050814" />
      <stop offset="50%" stop-color="#0a0d1e" />
      <stop offset="100%" stop-color="#02040a" />
    </linearGradient>
    
    <!-- Accent Gradient (Purple to Cyan) -->
    <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#a78bfa" />
      <stop offset="100%" stop-color="#22d3ee" />
    </linearGradient>
  </defs>

  <!-- Base Background -->
  <rect width="1200" height="630" fill="url(#bg-grad)" />

  <!-- Subtle Glowing Orbs -->
  <circle cx="200" cy="200" r="300" fill="#7c3aed" opacity="0.12" filter="blur(80px)" />
  <circle cx="1000" cy="450" r="250" fill="#0891b2" opacity="0.10" filter="blur(80px)" />

  <!-- Tech Grid Overlay -->
  <path d="M 0,100 L 1200,100 M 0,200 L 1200,200 M 0,300 L 1200,300 M 0,400 L 1200,400 M 0,500 L 1200,500
           M 200,0 L 200,630 M 400,0 L 400,630 M 600,0 L 600,630 M 800,0 L 800,630 M 1000,0 L 1000,630" 
        fill="none" stroke="rgba(255, 255, 255, 0.015)" stroke-width="1" />

  <!-- Frame / Outer Border -->
  <rect x="25" y="25" width="1150" height="580" rx="20" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="2" />
  
  <!-- Glowing Corner Accents -->
  <path d="M 25,120 L 25,45 A 20,20 0 0,1 45,25 L 120,25" fill="none" stroke="url(#accent-grad)" stroke-width="4" stroke-linecap="round" />
  <path d="M 1080,25 L 1155,25 A 20,20 0 0,1 1175,45 L 1175,120" fill="none" stroke="url(#accent-grad)" stroke-width="4" stroke-linecap="round" />
  
  <!-- Branding Header -->
  <text x="120" y="130" font-family="'Liberation Sans', system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#a78bfa" letter-spacing="3">
    HARSHIT GARG // PLATFORM ENGINE
  </text>

  <!-- Glowing Dot -->
  <circle cx="430" cy="125" r="4" fill="#22d3ee" />

  <!-- Dynamic Page Title (Gradient Text) -->
  <text x="120" y="220" font-family="'Liberation Sans', system-ui, -apple-system, sans-serif" font-size="58" font-weight="900" fill="url(#accent-grad)" letter-spacing="-1">
    ${titleTspans}
  </text>

  <!-- Dynamic Description -->
  <text x="120" y="${descY}" font-family="'Liberation Sans', system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#9ca3af" line-height="1.6">
    ${descTspans}
  </text>

  <!-- Footer Branding -->
  <text x="120" y="540" font-family="'Liberation Sans', system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#4b5563" letter-spacing="1">
    ARCHIE-GARG.COM
  </text>

  <text x="1080" y="540" font-family="'Liberation Sans', system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="rgba(34, 211, 238, 0.4)" text-anchor="end" letter-spacing="2">
    STATUS: ACTIVE
  </text>
</svg>
`;

    // Render the SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svgString))
      .png()
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // Cache for 7 days
    return res.send(pngBuffer);
  } catch (err) {
    console.error('❌ Error generating dynamic OG image:', err);
    res.status(500).send('Error generating preview image.');
  }
});

// Simple helper to escape special XML characters
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

module.exports = router;


