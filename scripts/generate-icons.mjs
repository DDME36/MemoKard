import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVG icon — clean book/brain mark on violet background
function makeSVG(size) {
  const r = Math.round(size * 0.22); // corner radius
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${r}" fill="#7C3AED"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#6D28D9"/>
    </linearGradient>
  </defs>
  <!-- Book icon centered -->
  <g transform="translate(${size * 0.5}, ${size * 0.5})">
    <path
      d="M${-size*0.22} ${-size*0.25} C${-size*0.22} ${-size*0.28} ${-size*0.18} ${-size*0.3} ${-size*0.13} ${-size*0.3} L${size*0.02} ${-size*0.3} L${size*0.02} ${size*0.3} L${-size*0.13} ${size*0.3} C${-size*0.18} ${size*0.3} ${-size*0.22} ${size*0.28} ${-size*0.22} ${size*0.25} Z"
      fill="white" opacity="0.9"
    />
    <path
      d="M${size*0.22} ${-size*0.25} C${size*0.22} ${-size*0.28} ${size*0.18} ${-size*0.3} ${size*0.13} ${-size*0.3} L${-size*0.02} ${-size*0.3} L${-size*0.02} ${size*0.3} L${size*0.13} ${size*0.3} C${size*0.18} ${size*0.3} ${size*0.22} ${size*0.28} ${size*0.22} ${size*0.25} Z"
      fill="white" opacity="0.7"
    />
    <line x1="0" y1="${-size*0.3}" x2="0" y2="${size*0.3}" stroke="#C4B5FD" stroke-width="${size*0.015}"/>
  </g>
</svg>`;
}

async function generateIcon(size, filename) {
  const svg = Buffer.from(makeSVG(size));
  await sharp(svg).png().toFile(join(publicDir, filename));
  console.log(`✓ ${filename} (${size}x${size})`);
}

await generateIcon(192, 'pwa-192x192.png');
await generateIcon(512, 'pwa-512x512.png');
await generateIcon(180, 'apple-touch-icon.png');
await generateIcon(32,  'favicon-32x32.png');
await generateIcon(16,  'favicon-16x16.png');

// Also write a simple favicon.ico placeholder (just copy 32px)
const favicon32 = await sharp(Buffer.from(makeSVG(32))).png().toBuffer();
writeFileSync(join(publicDir, 'favicon.ico'), favicon32);
console.log('✓ favicon.ico');

console.log('\nทุก icon พร้อมแล้ว!');
