/**
 * Generates PWA icons from public/logo.svg:
 *   pwa-192.png        — standard 192x192 (any purpose)
 *   pwa-512.png        — standard 512x512 (any purpose)
 *   pwa-maskable.png   — 512x512 with ~15% safe-zone padding and opaque bg
 *   apple-touch-icon.png — 180x180 for iOS home-screen
 *
 * Run: npm run pwa:icons (or via the build script)
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC = resolve(ROOT, 'public', 'logo.svg')
const OUT = resolve(ROOT, 'public')

const svgBuf = readFileSync(SRC)

/** Plain icon: render SVG at the requested square size, no extra padding. */
async function renderPlain(size, outName) {
  await sharp(svgBuf, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(OUT, outName))
  console.log(`✓ ${outName} (${size}×${size})`)
}

/** Maskable icon: opaque background + generous safe-zone padding so the OS
 *  can crop/clip the icon shape without clipping the logo. */
async function renderMaskable(size, outName) {
  // Safe zone is the inner 80% circle per W3C spec — pad the logo to 65% of canvas.
  const logoSize = Math.round(size * 0.65)
  const logo = await sharp(svgBuf, { density: 384 })
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      // Match the app's dark background so the maskable looks cohesive
      // when the launcher uses a circle/squircle mask.
      background: { r: 13, g: 13, b: 13, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(resolve(OUT, outName))
  console.log(`✓ ${outName} (${size}×${size}, maskable)`)
}

await renderPlain(192, 'pwa-192.png')
await renderPlain(512, 'pwa-512.png')
await renderPlain(180, 'apple-touch-icon.png')
await renderMaskable(512, 'pwa-maskable.png')

console.log('\nAll PWA icons generated in public/.')
