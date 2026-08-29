import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const outputDir = import.meta.dirname;
const heroPath = path.join(outputDir, 'hero-v3-latest-three-portals.png');
const svgPath = path.join(outputDir, 'Expo-Service-AI-rollup-latest.svg');
const pngPath = path.join(outputDir, 'Expo-Service-AI-rollup-latest.png');
const highResPath = path.join(outputDir, 'Expo-Service-AI-rollup-latest-print.png');
const previewPath = path.join(outputDir, 'Expo-Service-AI-rollup-latest-preview.jpg');

const width = 2400;
const height = 6000;
const heroBase64 = (await fs.readFile(heroPath)).toString('base64');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#00140F" stop-opacity="0.99"/>
      <stop offset="0.70" stop-color="#00271D" stop-opacity="0.88"/>
      <stop offset="1" stop-color="#00271D" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bottomShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#00140F" stop-opacity="0"/>
      <stop offset="0.23" stop-color="#00140F" stop-opacity="0.76"/>
      <stop offset="1" stop-color="#000C09" stop-opacity="0.99"/>
    </linearGradient>
    <linearGradient id="lime" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#D6FF2E"/>
      <stop offset="1" stop-color="#8BDD00"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.06"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="22" stdDeviation="28" flood-color="#000000" flood-opacity="0.42"/>
    </filter>
  </defs>

  <rect width="2400" height="6000" fill="#00140F"/>
  <image x="0" y="0" width="2400" height="6000" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,${heroBase64}"/>
  <rect x="0" y="0" width="2400" height="2200" fill="url(#topShade)"/>
  <rect x="0" y="3600" width="2400" height="2400" fill="url(#bottomShade)"/>

  <!-- Latest code-native robot mark and brand -->
  <g transform="translate(150 150)">
    <circle cx="86" cy="86" r="78" fill="#F6FFF1" stroke="#9BE31B" stroke-width="8"/>
    <path d="M86 24V45" stroke="#143326" stroke-width="9" stroke-linecap="round"/>
    <circle cx="86" cy="18" r="10" fill="#9BE31B" stroke="#143326" stroke-width="5"/>
    <rect x="31" y="51" width="110" height="77" rx="30" fill="#0B241A"/>
    <rect x="45" y="66" width="82" height="46" rx="20" fill="#9BE31B"/>
    <ellipse cx="69" cy="89" rx="9" ry="14" fill="#0B241A"/>
    <ellipse cx="103" cy="89" rx="9" ry="14" fill="#0B241A"/>
    <rect x="20" y="76" width="18" height="34" rx="9" fill="#0B241A"/>
    <rect x="134" y="76" width="18" height="34" rx="9" fill="#0B241A"/>
    <text x="205" y="78" fill="#FFFFFF" font-family="Arial, Microsoft YaHei, sans-serif" font-size="92" font-weight="900">Expo</text>
    <text x="448" y="78" fill="#9BE31B" font-family="Arial, Microsoft YaHei, sans-serif" font-size="92" font-weight="900">Service AI</text>
    <text x="207" y="138" fill="#BCD0C7" font-family="Microsoft YaHei, sans-serif" font-size="42" font-weight="600" letter-spacing="5">三端智能会展服务平台</text>
  </g>

  <g transform="translate(150 420)">
    <rect width="760" height="74" rx="37" fill="#9BE31B" fill-opacity="0.14" stroke="#9BE31B" stroke-opacity="0.48" stroke-width="3"/>
    <text x="380" y="50" text-anchor="middle" fill="#DFFF70" font-family="Arial, Microsoft YaHei, sans-serif" font-size="34" font-weight="800" letter-spacing="5">LATEST · THREE PORTALS</text>
  </g>

  <!-- Headline -->
  <text x="145" y="790" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="230" font-weight="900" letter-spacing="-8">一场展会，</text>
  <text x="145" y="1130" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="280" font-weight="900" letter-spacing="-12">一个</text>
  <text x="825" y="1130" fill="#BFFF18" font-family="Arial, Microsoft YaHei, sans-serif" font-size="310" font-weight="950" letter-spacing="-10">AI</text>
  <text x="1210" y="1130" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="280" font-weight="900" letter-spacing="-12">入口</text>
  <rect x="150" y="1250" width="930" height="15" rx="8" fill="url(#lime)"/>
  <text x="150" y="1405" fill="#EDF5F1" font-family="Microsoft YaHei, sans-serif" font-size="84" font-weight="650" letter-spacing="4">观众会找｜展商会接｜场馆会运营</text>
  <text x="150" y="1515" fill="#AFC5BC" font-family="Microsoft YaHei, sans-serif" font-size="50" font-weight="500" letter-spacing="4">兴趣推荐 · 行程规划 · 三端协同</text>

  <!-- Mid-scene anchor: one statement, no UI clutter -->
  <g transform="translate(180 3540)" filter="url(#shadow)">
    <rect width="2040" height="210" rx="105" fill="#001B14" fill-opacity="0.82" stroke="#BFFF18" stroke-opacity="0.55" stroke-width="4"/>
    <circle cx="108" cy="105" r="54" fill="url(#lime)"/>
    <path d="M82 105L101 124L137 83" fill="none" stroke="#0B281C" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="200" y="133" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="82" font-weight="850">从发现展位，到抵达现场</text>
    <text x="1890" y="130" text-anchor="end" fill="#BFFF18" font-family="Arial, sans-serif" font-size="94" font-weight="900">→</text>
  </g>

  <!-- Three accurate portal cards -->
  <g transform="translate(120 4050)" filter="url(#shadow)">
    <g>
      <rect width="690" height="660" rx="52" fill="url(#glass)" stroke="#FFFFFF" stroke-opacity="0.20" stroke-width="3"/>
      <text x="58" y="90" fill="#9BE31B" font-family="Arial, sans-serif" font-size="39" font-weight="900" letter-spacing="4">01 · VISITOR</text>
      <text x="58" y="195" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="82" font-weight="900">观众端</text>
      <rect x="58" y="246" width="160" height="10" rx="5" fill="#9BE31B"/>
      <text x="58" y="350" fill="#E6F0EC" font-family="Microsoft YaHei, sans-serif" font-size="48" font-weight="650">兴趣推荐</text>
      <text x="58" y="440" fill="#E6F0EC" font-family="Microsoft YaHei, sans-serif" font-size="48" font-weight="650">展位检索</text>
      <text x="58" y="530" fill="#E6F0EC" font-family="Microsoft YaHei, sans-serif" font-size="48" font-weight="650">本机行程</text>
    </g>
    <g transform="translate(735 0)">
      <rect width="690" height="660" rx="52" fill="url(#glass)" stroke="#FFFFFF" stroke-opacity="0.20" stroke-width="3"/>
      <text x="58" y="90" fill="#9BE31B" font-family="Arial, sans-serif" font-size="39" font-weight="900" letter-spacing="4">02 · EXHIBITOR</text>
      <text x="58" y="195" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="82" font-weight="900">展商端</text>
      <rect x="58" y="246" width="160" height="10" rx="5" fill="#9BE31B"/>
      <text x="58" y="350" fill="#E6F0EC" font-family="Microsoft YaHei, sans-serif" font-size="48" font-weight="650">内容发布</text>
      <text x="58" y="440" fill="#E6F0EC" font-family="Microsoft YaHei, sans-serif" font-size="48" font-weight="650">活动预约</text>
      <text x="58" y="530" fill="#E6F0EC" font-family="Microsoft YaHei, sans-serif" font-size="48" font-weight="650">服务工单</text>
    </g>
    <g transform="translate(1470 0)">
      <rect width="690" height="660" rx="52" fill="url(#glass)" stroke="#FFFFFF" stroke-opacity="0.20" stroke-width="3"/>
      <text x="58" y="90" fill="#9BE31B" font-family="Arial, sans-serif" font-size="39" font-weight="900" letter-spacing="4">03 · OPERATIONS</text>
      <text x="58" y="195" fill="#FFFFFF" font-family="Microsoft YaHei, sans-serif" font-size="82" font-weight="900">运营端</text>
      <rect x="58" y="246" width="160" height="10" rx="5" fill="#9BE31B"/>
      <text x="58" y="350" fill="#E6F0EC" font-family="Microsoft YaHei, sans-serif" font-size="48" font-weight="650">地图复核</text>
      <text x="58" y="440" fill="#E6F0EC" font-family="Microsoft YaHei, sans-serif" font-size="48" font-weight="650">现场通知</text>
      <text x="58" y="530" fill="#E6F0EC" font-family="Microsoft YaHei, sans-serif" font-size="48" font-weight="650">工单调度</text>
    </g>
  </g>

  <!-- CTA and deliberately replaceable QR slot -->
  <g transform="translate(120 4885)" filter="url(#shadow)">
    <rect width="2160" height="850" rx="68" fill="#F7FAF8"/>
    <text x="82" y="135" fill="#5A8708" font-family="Arial, Microsoft YaHei, sans-serif" font-size="42" font-weight="900" letter-spacing="7">TRY THE VISITOR PORTAL</text>
    <text x="82" y="290" fill="#071D15" font-family="Microsoft YaHei, sans-serif" font-size="112" font-weight="900">扫码体验观众端</text>
    <text x="82" y="405" fill="#52665D" font-family="Microsoft YaHei, sans-serif" font-size="54" font-weight="600">无需注册｜观展记录仅存本机</text>
    <g transform="translate(82 495)">
      <rect width="980" height="150" rx="75" fill="url(#lime)"/>
      <text x="490" y="101" text-anchor="middle" fill="#092319" font-family="Microsoft YaHei, sans-serif" font-size="64" font-weight="900">现场体验，一键出发  →</text>
    </g>

    <g transform="translate(1660 145)">
      <rect width="380" height="380" rx="36" fill="#FFFFFF" stroke="#D8E2DD" stroke-width="6"/>
      <path d="M42 122V42H122 M258 42H338V122 M338 258V338H258 M122 338H42V258" fill="none" stroke="#9BE31B" stroke-width="18" stroke-linecap="round"/>
      <circle cx="190" cy="190" r="46" fill="#EAF7D5"/>
      <path d="M172 190L187 205L216 174" fill="none" stroke="#538600" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="190" y="440" text-anchor="middle" fill="#596B63" font-family="Microsoft YaHei, sans-serif" font-size="38" font-weight="700">正式二维码位</text>
    </g>
  </g>

  <text x="120" y="5865" fill="#82978E" font-family="Microsoft YaHei, sans-serif" font-size="34" font-weight="500">当前为黑客松演示数据；地图与路线经场馆复核后开放。</text>
  <rect x="0" y="5920" width="2400" height="80" fill="#000B08"/>
</svg>`;

await fs.writeFile(svgPath, svg, 'utf8');

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(pngPath);

await sharp(Buffer.from(svg), { density: 108 })
  .resize({ width: 3600, height: 9000, fit: 'fill' })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(highResPath);

await sharp(pngPath)
  .resize({ width: 800 })
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(previewPath);

console.log(JSON.stringify({ svgPath, pngPath, highResPath, previewPath, width, height }, null, 2));
