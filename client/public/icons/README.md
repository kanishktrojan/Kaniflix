# PWA Assets Guide

This document explains how to generate the required PWA assets for KANIFLIX.

## Required Icons

The following icon sizes are needed for the PWA manifest:

| Size | Filename | Purpose |
|------|----------|---------|
| 72x72 | icon-72x72.png | Android low-res |
| 96x96 | icon-96x96.png | Android |
| 128x128 | icon-128x128.png | Web |
| 144x144 | icon-144x144.png | Windows tile |
| 152x152 | icon-152x152.png | iOS |
| 167x167 | icon-167x167.png | iPad Pro |
| 180x180 | icon-180x180.png | iPhone |
| 192x192 | icon-192x192.png | Android/Chrome |
| 384x384 | icon-384x384.png | Large |
| 512x512 | icon-512x512.png | Android Splash |

### Design Guidelines

1. **App Icon Requirements:**
   - Use the KANIFLIX logo (red "K" or full logo)
   - Background should be #141414 (dark background) or #E50914 (red)
   - Icons should be square with rounded corners handled by the OS
   - For maskable icons, ensure important content is in the center 80%

2. **Creating Icons:**
   - Start with a 1024x1024 source image
   - Use tools like:
     - [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
     - [RealFaviconGenerator](https://realfavicongenerator.net/)
     - Figma/Photoshop with export scripts

## Splash Screens (iOS)

iOS requires specific splash screen sizes for different devices:

| Device | Size | Filename |
|--------|------|----------|
| iPhone SE | 640x1136 | splash-640x1136.png |
| iPhone 8 | 750x1334 | splash-750x1334.png |
| iPhone 8 Plus | 1242x2208 | splash-1242x2208.png |
| iPhone X/XS/11 Pro | 1125x2436 | splash-1125x2436.png |
| iPhone XS Max/11 Pro Max | 1242x2688 | splash-1242x2688.png |
| iPhone XR/11 | 828x1792 | splash-828x1792.png |
| iPhone 12/13 | 1170x2532 | splash-1170x2532.png |
| iPhone 12/13 Pro Max | 1284x2778 | splash-1284x2778.png |

### Splash Screen Design:
- Background: #141414
- Centered KANIFLIX logo
- Keep design simple for fast loading

## Screenshots (Optional but Recommended)

For app store-like install experience:

| Type | Size | Filename |
|------|------|----------|
| Desktop | 1280x720 | home-wide.png |
| Mobile | 750x1334 | home-narrow.png |

## Quick Generation Script

You can use this Node.js script to generate icons from a source image:

```javascript
// scripts/generate-icons.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
const sourceImage = 'icon-source.png';
const outputDir = './public/icons';

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    await sharp(sourceImage)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
    
    console.log(`Generated icon-${size}x${size}.png`);
  }
}

generateIcons().catch(console.error);
```

## Temporary Placeholder

Until proper icons are created, you can use a simple SVG as a placeholder.
The app will work without icons, but won't have the full PWA experience.

## Testing PWA Installation

1. Build the app: `npm run build`
2. Serve the build: `npm run preview`
3. Open Chrome DevTools > Application > Manifest
4. Check for any manifest errors
5. Test "Install App" functionality
