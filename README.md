# Protocol Explorer

An independently implemented educational recreation inspired by [Protocol Explorer](https://protocol-explorer-alpha.vercel.app/). The lessons and SVG device diagrams are original; no reference source code or lesson assets are included.

## Run locally

Requires Node.js 22.18+ (or Node 24) and npm.

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` checks TypeScript and produces `dist`; `npm run preview` serves the build. `npm test` checks the catalog, playback clock, and synthetic wire encoding. With the dev server running on port 5173, `npx playwright test spec.ts` checks the dashboard, all 39 lessons, animation, packet inspection, and mobile stage navigation (install Chromium with `npx playwright install chromium` if needed). Set `PREVIEW_URL` to run these checks against the deployed site.

## Explore

Select one of 39 protocols or search protocols and individual lesson stages with Ctrl/Cmd+K or `/`. Selecting a stage plays only that stage's packets; local actions such as preparing a request and rendering a page do not invent packets. Category tabs narrow the catalog. Network and Sequence views share the same packet timeline. Each packet travels once along its route; pause preserves the exact position, speed changes apply without restarting, and completion waits for the final arrival. Reduced-motion mode keeps markers stationary while the timeline advances. On narrow screens the catalog is a disclosure, the overview precedes the packet table, and playback controls remain reachable at the bottom.

The OSI numbers filter the catalog by its existing layer classifications, combined with the category tabs. A filled button indicates the filter; a dot marks the current lesson's layer independently. Start with all layers; click a selected number again or All to clear the layer, or Clear filters to reset both filters. Filtering opens the catalog even from diagram-only mode and does not change the current lesson or playback. Empty intersections explain why nothing matches. Global protocol/stage search remains unfiltered; choosing a result clears only incompatible filters. These controls are also available on mobile.

**How this step works** in the right pane explains all 168 stages across the 39 protocols. Each original walkthrough names the mechanism and explains its input, rule/decision and result, with notes distinguishing protocol requirements from negotiated or implementation-specific behavior. It follows sidebar/search selection, packet navigation and playback, including local HTTP preparation/rendering steps. For example, NTP shows its four-timestamp offset/delay formulas, while Wi-Fi explains contention/backoff and distinguishes authentication modes. The section opens by default and collapses when inspecting packets to keep inspection controls reachable; its native disclosure remains keyboard-accessible and can be reopened. These are illustrative explanations, not executing algorithms or cryptographic implementations.

Select a row or sequence arrow to inspect a packet, including in diagram-only view. Supported DNS/UDP, TCP handshake, and HTTP examples expose constructed Ethernet/IPv4 frames, computed checksums, field byte ranges, and hexadecimal/ASCII inspection. Select a field to highlight its bytes. Unmodeled events show a clearly labeled message summary instead of fabricated wire bytes. Theme preferences are saved locally.

Keyboard shortcuts: L toggles the catalog; D toggles diagram-only mode; V changes diagram view; T changes theme; brackets adjust speed; 1–9 select a lesson stage; F toggles fullscreen; Space plays/pauses; arrows move between stages (between packets while inspecting); S steps one packet; R resets; ? displays help. Escape closes the inspector or leaves the selected stage. Interactive controls keep their native keyboard behavior.

## Educational scope

This is a frontend, not a network sniffer or full protocol simulator. Timings, addresses, sequence values, and link headers are synthetic. Supported frames contain wire-format fields and valid IPv4/transport checksums, but are not captures; Ethernet FCS and preamble are omitted. Other protocols, multi-message handshakes, and DNS root/TLD referrals remain summarized and are explicitly labeled. OSI layers are teaching approximations. Only English is available, unlike the reference's multilingual lessons. Optional Google Fonts have local fallback stacks. No backend service is required.

## GitHub Pages

The public site is hosted at https://nuthanreddy.github.io/protocol-explorer/. Pushes to `main` run the catalog checks, build the site, and deploy through the GitHub Pages workflow. Production builds use the `/protocol-explorer/` asset base; local development continues to use `/`.
