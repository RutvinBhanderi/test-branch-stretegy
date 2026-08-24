# Icons

Drop the real app icons here before the first release build:

- `icon-192.png` - 192x192, purpose "any"
- `icon-512.png` - 512x512, purpose "any"
- `icon-maskable-512.png` - 512x512, purpose "maskable" (safe-zone padding per
  https://web.dev/articles/maskable-icon)

`app/manifest.ts` already references these three filenames - swapping the PNGs in is
the only step needed once brand assets are ready.
