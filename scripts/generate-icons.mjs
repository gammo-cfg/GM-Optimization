import sharp from 'sharp';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'src-tauri', 'icons');
const svgPath = join(__dirname, '..', 'icon.svg');
const svg = readFileSync(svgPath);

const sizes = [
  { name: 'icon.png', size: 512 },
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

async function generate() {
  mkdirSync(iconsDir, { recursive: true });
  const icoPngs = [];
  for (const { name, size } of sizes) {
    const buf = await sharp(svg).resize(size, size).png().toBuffer();
    writeFileSync(join(iconsDir, name), buf);
    console.log(`  ${name} (${size}x${size})`);
    if (size <= 256) icoPngs.push(buf);
  }
  // Generate .ico (use largest PNG as input, png-to-ico handles multi-res)
  const icoBuf = await pngToIco(icoPngs);
  writeFileSync(join(iconsDir, 'icon.ico'), icoBuf);
  console.log('  icon.ico (multi-res)');
  // .icns: macOS placeholder
  writeFileSync(join(iconsDir, 'icon.icns'), await sharp(svg).resize(256, 256).png().toBuffer());
  console.log('  icon.icns (256x256)');
}
generate().catch(console.error);
