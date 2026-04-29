/**
 * Build the app icon source PNG (1024×1024) — white logo centred on a black
 * rounded-square background, then `pnpm tauri icon` derives every platform
 * size (icns / ico / Android / iOS).
 *
 * Run: `bun run icons`
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../public/logo.svg');
const OUT = resolve(__dirname, '../src-tauri/icons/source.png');

const SIZE = 1024;
const RADIUS = 180; // ~17.5%, close to the macOS "squircle" feel
const LOGO_SIZE = 640; // padding around the glyph

const svg = readFileSync(SRC, 'utf8').replace(/currentColor/g, 'white');

// 1. Rasterise the logo on a transparent square at LOGO_SIZE×LOGO_SIZE.
const logoBuf = await sharp(Buffer.from(svg), { density: 600 })
  .resize(LOGO_SIZE, LOGO_SIZE, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

// 2. Build a black rounded-square base of SIZE×SIZE.
const maskSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
     <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="black"/>
   </svg>`,
);

mkdirSync(dirname(OUT), { recursive: true });

await sharp(maskSvg)
  .composite([
    {
      input: logoBuf,
      top: Math.round((SIZE - LOGO_SIZE) / 2),
      left: Math.round((SIZE - LOGO_SIZE) / 2),
    },
  ])
  .png()
  .toFile(OUT);

console.log(`Wrote ${OUT}`);
