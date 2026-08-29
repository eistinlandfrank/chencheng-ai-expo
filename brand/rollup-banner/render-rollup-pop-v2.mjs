import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const outputDir = import.meta.dirname;
const heroPath = path.join(outputDir, 'hero-v4-playful-robot.png');
const svgPath = path.join(outputDir, 'Expo-Service-AI-rollup-pop-v2.svg');
const pngPath = path.join(outputDir, 'Expo-Service-AI-rollup-pop-v2.png');
const highResPath = path.join(outputDir, 'Expo-Service-AI-rollup-pop-v2-print.png');
const previewPath = path.join(outputDir, 'Expo-Service-AI-rollup-pop-v2-preview.jpg');

const width = 2400;
const height = 6000;
const heroBase64 = (await fs.readFile(heroPath)).toString('base64');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="lime" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#D9FF16"/>
      <stop offset="1" stop-color="#9DEA00"/>
    </linearGradient>
    <filter id="hardShadow" x="-20%" y="-20%" width="150%" height="160%">
      <feDropShadow dx="18" dy="24" stdDeviation="0" flood-color="#061C13" flood-opacity="0.96"/>
    </filter>
    <filter id="softShadow" x="-20%" y="-20%" width="150%" height="160%">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#000000" flood-opacity="0.34"/>
    </filter>
    <clipPath id="qrSlot"><rect x="0" y="0" width="520" height="520" rx="44"/></clipPath>
  </defs>

  <rect width="2400" height="6000" fill="#BFFF00"/>
  <image x="0" y="0" width="2400" height="6000" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,${heroBase64}"/>
  <rect x="0" y="0" width="2400" height="1580" fill="#BFFF00" fill-opacity="0.88"/>

  <!-- Compact latest brand -->
  <g transform="translate(105 105)">
    <circle cx="66" cy="66" r="59" fill="#FFFFFF" stroke="#071E15" stroke-width="7"/>
    <path d="M66 12V29" stroke="#071E15" stroke-width="8" stroke-linecap="round"/>
    <circle cx="66" cy="9" r="8" fill="#FF4D2E" stroke="#071E15" stroke-width="4"/>
    <rect x="24" y="36" width="84" height="60" rx="23" fill="#071E15"/>
    <rect x="35" y="47" width="62" height="38" rx="16" fill="#BFFF00"/>
    <ellipse cx="53" cy="66" rx="7" ry="11" fill="#071E15"/>
    <ellipse cx="79" cy="66" rx="7" ry="11" fill="#071E15"/>
    <text x="155" y="62" fill="#071E15" font-family="Arial, Microsoft YaHei, sans-serif" font-size="74" font-weight="950">Expo Service AI</text>
    <text x="157" y="111" fill="#173B2C" font-family="Microsoft YaHei, sans-serif" font-size="32" font-weight="800" letter-spacing="4">AI 智能逛展助手</text>
  </g>

  <!-- Street-campaign headline -->
  <text x="105" y="505" fill="#071E15" font-family="Microsoft YaHei, sans-serif" font-size="205" font-weight="950" letter-spacing="-9">这么大个展，</text>
  <g transform="rotate(-2 840 795)" filter="url(#hardShadow)">
    <rect x="90" y="620" width="1500" height="355" rx="22" fill="#071E15"/>
    <text x="160" y="875" fill="#BFFF00" font-family="Microsoft YaHei, sans-serif" font-size="238" font-weight="950" letter-spacing="-8">你真要</text>
  </g>
  <text x="105" y="1315" fill="#071E15" font-family="Microsoft YaHei, sans-serif" font-size="255" font-weight="950" letter-spacing="-13">一个个逛</text>
  <text x="1460" y="1430" fill="#FF4D2E" font-family="Arial, sans-serif" font-size="680" font-weight="950">?</text>
  <g transform="rotate(7 1915 770)" filter="url(#hardShadow)">
    <rect x="1610" y="630" width="650" height="240" rx="120" fill="#FF4D2E"/>
    <text x="1935" y="790" text-anchor="middle" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="92" font-weight="950">先让 AI 挑！</text>
  </g>

  <!-- Three oversized action stickers, no formal cards -->
  <g transform="rotate(-7 410 2110)" filter="url(#hardShadow)">
    <rect x="110" y="1990" width="600" height="210" rx="34" fill="#071E15"/>
    <text x="410" y="2136" text-anchor="middle" fill="#BFFF00" font-family="Microsoft YaHei, sans-serif" font-size="92" font-weight="950">找展位</text>
  </g>
  <g transform="rotate(7 1980 2810)" filter="url(#hardShadow)">
    <rect x="1640" y="2700" width="680" height="215" rx="34" fill="#FFFFFF"/>
    <text x="1980" y="2848" text-anchor="middle" fill="#071E15" font-family="Microsoft YaHei, sans-serif" font-size="94" font-weight="950">排顺序</text>
  </g>
  <g transform="rotate(-8 350 3540)" filter="url(#hardShadow)">
    <rect x="95" y="3425" width="510" height="220" rx="110" fill="#FF4D2E"/>
    <text x="350" y="3576" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Microsoft YaHei, sans-serif" font-size="96" font-weight="950">问 AI</text>
  </g>

  <!-- One-line explanation crossing the hero -->
  <g transform="rotate(-2 1200 4485)" filter="url(#softShadow)">
    <rect x="80" y="4330" width="2240" height="310" rx="30" fill="#FFFFFF"/>
    <rect x="80" y="4330" width="32" height="310" fill="#FF4D2E"/>
    <text x="165" y="4465" fill="#071E15" font-family="Microsoft YaHei, sans-serif" font-size="54" font-weight="800">告诉 AI 你想找什么</text>
    <text x="165" y="4562" fill="#071E15" font-family="Microsoft YaHei, sans-serif" font-size="74" font-weight="950">先筛重点，再排参观顺序。</text>
  </g>

  <!-- Full-bleed CTA hides the generated placeholder and owns the bottom -->
  <rect x="0" y="4720" width="2400" height="1280" fill="#031A12"/>
  <rect x="0" y="4720" width="2400" height="24" fill="url(#lime)"/>
  <g transform="translate(110 4825)">
    <rect width="1040" height="92" rx="46" fill="#BFFF00"/>
    <text x="520" y="63" text-anchor="middle" fill="#071E15" font-family="Microsoft YaHei, sans-serif" font-size="43" font-weight="950" letter-spacing="3">观众端 × 展商端 × 场馆运营端</text>
    <text x="0" y="250" fill="#BFFF00" font-family="Microsoft YaHei, sans-serif" font-size="55" font-weight="900" letter-spacing="4">扫码问一句</text>
    <text x="0" y="440" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="132" font-weight="950" letter-spacing="-6">我该先看</text>
    <text x="0" y="615" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="132" font-weight="950" letter-spacing="-6">哪几个？</text>
    <path d="M1060 515H1450" stroke="#BFFF00" stroke-width="34" stroke-linecap="round"/>
    <path d="M1400 440L1480 515L1400 590" fill="none" stroke="#BFFF00" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Replaceable verified QR area -->
  <g transform="translate(1690 4910)" filter="url(#softShadow)">
    <rect width="560" height="650" rx="52" fill="#FFFFFF"/>
    <g transform="translate(20 20)" clip-path="url(#qrSlot)">
      <rect width="520" height="520" fill="#F8FBF9"/>
      <path d="M55 160V55H160 M360 55H465V160 M465 360V465H360 M160 465H55V360" fill="none" stroke="#A7EF00" stroke-width="25" stroke-linecap="round"/>
      <circle cx="260" cy="260" r="70" fill="#E4F6C5"/>
      <path d="M224 260L251 287L303 231" fill="none" stroke="#3D7100" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="280" y="605" text-anchor="middle" fill="#51665D" font-family="Microsoft YaHei, sans-serif" font-size="38" font-weight="800">替换正式体验码</text>
  </g>

  <rect x="0" y="5920" width="2400" height="80" fill="#020D09"/>
</svg>`;

await fs.writeFile(svgPath, svg, 'utf8');
await sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(pngPath);
await sharp(Buffer.from(svg), { density: 108 })
  .resize({ width: 3600, height: 9000, fit: 'fill' })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(highResPath);
await sharp(pngPath)
  .resize({ width: 800 })
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(previewPath);

console.log(JSON.stringify({ svgPath, pngPath, highResPath, previewPath, width, height }, null, 2));
