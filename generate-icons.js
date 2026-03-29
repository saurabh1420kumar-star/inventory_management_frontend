const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const source = path.join(__dirname, 'src', 'assets', 'images', 'nectar.jpeg');
const androidRes = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const sizes = [
  // Android launcher icons
  { size: 48,  dir: 'mipmap-mdpi',    file: 'ic_launcher.png' },
  { size: 72,  dir: 'mipmap-hdpi',    file: 'ic_launcher.png' },
  { size: 96,  dir: 'mipmap-xhdpi',   file: 'ic_launcher.png' },
  { size: 144, dir: 'mipmap-xxhdpi',  file: 'ic_launcher.png' },
  { size: 192, dir: 'mipmap-xxxhdpi', file: 'ic_launcher.png' },
  // Round icons
  { size: 48,  dir: 'mipmap-mdpi',    file: 'ic_launcher_round.png' },
  { size: 72,  dir: 'mipmap-hdpi',    file: 'ic_launcher_round.png' },
  { size: 96,  dir: 'mipmap-xhdpi',   file: 'ic_launcher_round.png' },
  { size: 144, dir: 'mipmap-xxhdpi',  file: 'ic_launcher_round.png' },
  { size: 192, dir: 'mipmap-xxxhdpi', file: 'ic_launcher_round.png' },
  // Foreground icons (adaptive icon foreground, needs to be 108dp = size * 1.5 approx)
  { size: 72,  dir: 'mipmap-mdpi',    file: 'ic_launcher_foreground.png' },
  { size: 108, dir: 'mipmap-hdpi',    file: 'ic_launcher_foreground.png' },
  { size: 144, dir: 'mipmap-xhdpi',   file: 'ic_launcher_foreground.png' },
  { size: 216, dir: 'mipmap-xxhdpi',  file: 'ic_launcher_foreground.png' },
  { size: 288, dir: 'mipmap-xxxhdpi', file: 'ic_launcher_foreground.png' },
];

async function generate() {
  for (const { size, dir, file } of sizes) {
    const outDir = path.join(androidRes, dir);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, file);
    await sharp(source)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(outPath);
    console.log(`  ✓ ${dir}/${file} (${size}x${size})`);
  }

  // Favicon for web
  const faviconPath = path.join(__dirname, 'src', 'assets', 'icon', 'favicon.png');
  await sharp(source)
    .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(faviconPath);
  console.log(`  ✓ favicon.png (256x256)`);

  console.log('\nAll icons generated successfully!');
}

generate().catch(err => { console.error(err); process.exit(1); });
