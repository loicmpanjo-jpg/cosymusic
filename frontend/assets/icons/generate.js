// Generate PNG icons from SVG
// Run: node assets/icons/generate.js

const fs = require('fs');
const path = require('path');

// For production, use sharp or svg2png
// npm install sharp

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgTemplate = fs.readFileSync(path.join(__dirname, 'icon-512x512.svg'), 'utf8');

console.log('Icon generation script');
console.log('Install sharp: npm install sharp');
console.log('Then run: node generate.js');

/*
const sharp = require('sharp');

async function generate() {
  for (const size of sizes) {
    await sharp(Buffer.from(svgTemplate))
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `icon-${size}x${size}.png`));
    console.log(`Generated ${size}x${size}`);
  }
}

generate().catch(console.error);
*/
