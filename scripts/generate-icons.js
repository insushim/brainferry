const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

function generateSvgIcon(size) {
  const padding = Math.round(size * 0.12);
  const innerSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2 - size * 0.03;
  const scale = innerSize / 280;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6"/>
      <stop offset="100%" style="stop-color:#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#bg)"/>
  <g transform="translate(${cx},${cy}) scale(${scale.toFixed(3)})" fill="none" stroke="#FFFFFF" stroke-width="${(16 / scale).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-10,-90 C-60,-90 -110,-70 -120,-20 C-130,30 -100,60 -80,80 C-60,100 -30,110 -10,100" fill="#FFFFFF" fill-opacity="0.15"/>
    <path d="M-10,-90 C-60,-90 -110,-70 -120,-20 C-130,30 -100,60 -80,80 C-60,100 -30,110 -10,100"/>
    <path d="M10,-90 C60,-90 110,-70 120,-20 C130,30 100,60 80,80 C60,100 30,110 10,100" fill="#FFFFFF" fill-opacity="0.15"/>
    <path d="M10,-90 C60,-90 110,-70 120,-20 C130,30 100,60 80,80 C60,100 30,110 10,100"/>
    <line x1="0" y1="-85" x2="0" y2="95"/>
    <path d="M-10,-40 C-50,-35 -70,-15 -65,15"/>
    <path d="M-10,10 C-45,15 -70,35 -55,60"/>
    <path d="M10,-40 C50,-35 70,-15 65,15"/>
    <path d="M10,10 C45,15 70,35 55,60"/>
  </g>
  <g transform="translate(0,${size * 0.78})" fill="none" stroke="#FFFFFF" stroke-width="${Math.max(2, Math.round(size * 0.015))}" stroke-linecap="round" opacity="0.5">
    <path d="M${size * 0.1},${size * 0.04} Q${size * 0.2},${-size * 0.02} ${size * 0.3},${size * 0.04} Q${size * 0.4},${size * 0.1} ${size * 0.5},${size * 0.04} Q${size * 0.6},${-size * 0.02} ${size * 0.7},${size * 0.04} Q${size * 0.8},${size * 0.1} ${size * 0.9},${size * 0.04}"/>
  </g>
</svg>`;
}

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

for (const size of SIZES) {
  const svg = generateSvgIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(ICONS_DIR, filename), svg);
  console.log(`Generated ${filename}`);
}

console.log('\nSVG icons generated successfully.');
console.log('To generate PNG icons, open scripts/icon-generator.html in a browser.');
console.log('Or use a tool like Inkscape CLI:');
console.log('  inkscape icon.svg --export-type=png --export-width=512 --export-filename=icon-512x512.png');
