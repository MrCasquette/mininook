/**
 * Build the app icon source PNG (1024×1024) following Apple's icon template:
 * a centred 824×824 squircle (radius ≈22% of body) leaves the standard 100px
 * margin around the visible art so the dock renders MiniNook the same size
 * as native apps. The white logo glyph sits inside the body with breathing
 * room (~60% of the body width).
 *
 * `pnpm tauri icon` then derives every platform-specific size from this PNG.
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

const CANVAS = 1024;
const BODY = 824; // visible body, leaves 100 px margin all around
const BODY_OFFSET = Math.round((CANVAS - BODY) / 2);
const BODY_RADIUS = 185; // ≈22.5% of BODY — Apple's continuous corner feel
const LOGO_SIZE = 500; // ≈60% of the body for proper breathing room

const svg = readFileSync(SRC, 'utf8').replace(/currentColor/g, 'white');

// 1. Rasterise the white glyph on a transparent square at LOGO_SIZE.
const logoBuf = await sharp(Buffer.from(svg), { density: 600 })
  .resize(LOGO_SIZE, LOGO_SIZE, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

// 2. Build the canvas: black squircle body inset on a transparent canvas.
const canvasSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
     <rect x="${BODY_OFFSET}" y="${BODY_OFFSET}" width="${BODY}" height="${BODY}" rx="${BODY_RADIUS}" ry="${BODY_RADIUS}" fill="black"/>
   </svg>`,
);

mkdirSync(dirname(OUT), { recursive: true });

await sharp(canvasSvg)
  .composite([
    {
      input: logoBuf,
      top: Math.round((CANVAS - LOGO_SIZE) / 2),
      left: Math.round((CANVAS - LOGO_SIZE) / 2),
    },
  ])
  .png()
  .toFile(OUT);

console.log(`Wrote ${OUT}`);
