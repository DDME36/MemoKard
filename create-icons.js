// Simple script to create placeholder PWA icons
// Run with: node create-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG that can be used as PNG placeholder
function createIconSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E3F2FD;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#E8F5E9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F3E5F5;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <circle cx="${size * 0.3}" cy="${size * 0.3}" r="${size * 0.2}" fill="rgba(255,255,255,0.3)"/>
  <text x="${size / 2}" y="${size * 0.62}" font-size="${size * 0.5}" text-anchor="middle" fill="#333">🧠</text>
</svg>`;
}

const publicDir = path.join(__dirname, 'public');

// Create 192x192 icon
fs.writeFileSync(
  path.join(publicDir, 'pwa-192x192.svg'),
  createIconSVG(192)
);

// Create 512x512 icon
fs.writeFileSync(
  path.join(publicDir, 'pwa-512x512.svg'),
  createIconSVG(512)
);

console.log('✅ SVG icons created successfully!');
console.log('📝 Note: For best PWA support, convert these to PNG using an online tool.');
console.log('   Visit: https://cloudconvert.com/svg-to-png');
