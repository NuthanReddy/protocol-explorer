# Protocol Explorer

An independently implemented educational recreation inspired by [Protocol Explorer](https://protocol-explorer-alpha.vercel.app/). The lessons and SVG device diagrams are original; no reference source code or lesson assets are included.

## Run locally

Requires Node.js 22.18+ (or Node 24) and npm.

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` checks TypeScript and produces `dist`; `npm run preview` serves the build. `npm test` checks the original protocol catalog. With the dev server running on port 5173, `npx playwright test explorer.spec.ts` checks the interactive dashboard and all 39 lessons (install Chromium with `npx playwright install chromium` if needed).

## Explore

Select one of 39 protocols or search with Ctrl/Cmd+K. Category tabs narrow the catalog. Network and Sequence views share the same packet timeline. During playback, each packet travels once from source to destination along its route; sequence arrows reveal the same progress. Pause preserves the exact position, speed changes apply without restarting the packet, and completion waits for the final arrival. Step and packet selection show an arrived packet. Reduced-motion mode keeps markers stationary while the packet timeline still advances. Select a row or sequence arrow to inspect illustrative fields and a UTF-8 hexadecimal preview. Theme preferences are saved locally.

Keyboard shortcuts: L toggles the catalog; D toggles diagram-only mode; F toggles browser fullscreen; Space plays/pauses; arrows move between packets; R resets; ? displays help. Interactive controls keep their native keyboard behavior.

## Educational scope

This is a local frontend, not a network sniffer or full protocol simulator. Exchanges, sizes, and timings are synthetic; some multi-message handshakes and upstream hops are summarized. OSI layers are teaching approximations. The hexadecimal view encodes illustrative field text, not real serialized network packets. Only English is available. Optional Google Fonts have local fallback stacks. No deployment or backend service is required.

## GitHub Pages

The public site is hosted at https://nuthanreddy.github.io/protocol-explorer/. Pushes to `main` run the catalog checks, build the site, and deploy through the GitHub Pages workflow. Production builds use the `/protocol-explorer/` asset base; local development continues to use `/`.
