# Expo Service AI roll-up banner

This 2:5 roll-up banner follows the current three-portal product on `main`:

- visitor portal: interest recommendations, booth search, and local itinerary;
- exhibitor portal: content publishing, activity reservations, and service tickets;
- operations portal: map review, on-site notices, and ticket dispatch.

Files:

- `Expo-Service-AI-rollup-latest-print.png`: 3600 × 9000 print raster;
- `Expo-Service-AI-rollup-latest.svg`: editable 2400 × 6000 source;
- `Expo-Service-AI-rollup-latest-preview.jpg`: lightweight review copy;
- `hero-v3-latest-three-portals.png`: generated hero artwork;
- `render-rollup-latest.mjs`: deterministic text/layout renderer.

The QR area is deliberately left replaceable. Add a verified production URL only after the current visitor portal is deployed. The small footer preserves the product's current data boundary: booth and map content are demonstration data, and routes open only after venue review.

## Pop campaign variant

The `rollup-pop-v2` files are the high-attention event-floor variant. They replace the formal three-column presentation with an oversized robot, a provocative question, three action stickers, and a high-contrast CTA. The copy stays within the current product boundary: booth filtering, visit ordering, and text-based AI help. Its QR area remains deliberately replaceable until a production visitor URL is verified.

## Verified QR variant

The `rollup-pop-v2-qr` files are the print-ready campaign variant with a verified, high-error-correction QR code. The code resolves to `https://chencheng-speedtest.pages.dev/` and was decoded again from the final rendered banner after export.

- `Expo-Service-AI-rollup-pop-v2-qr.svg`: editable vector source;
- `Expo-Service-AI-rollup-pop-v2-qr.png`: 2400 × 6000 production raster;
- `Expo-Service-AI-rollup-pop-v2-qr-print.png`: 3600 × 9000 high-resolution print raster;
- `Expo-Service-AI-rollup-pop-v2-qr-preview.jpg`: lightweight review copy.

Standalone QR exports are also available for reuse in other materials:

- `Expo-Service-AI-website-qr.png`: 1200 × 1200 high-resolution raster;
- `Expo-Service-AI-website-qr.svg`: scalable vector source.
