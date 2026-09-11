# GM-Optimization — Neon Reactor visual system

## Product feeling
GM is a performance cockpit, not a generic dashboard. It should feel energized, technical, reactive, cinematic, and unmistakably GM.

## Identity
- Background: near-black, never flat gray.
- Primary energy: hot orange (#ff5a00) through amber (#ffb15a).
- White is reserved for important text and data.
- Green is only system-positive state; red is only destructive/error state.
- Surfaces use cut corners, circuit accents, scan traces, and low-opacity technical grids.

## Motion rules
- Continuous ambient motion belongs to energy rails, traces, rings, scan lines, and small reactor indicators.
- Interaction motion belongs to transform and opacity first. Avoid layout-heavy animation.
- Navigation changes get a fast scan/reveal rather than a generic fade.
- Buttons use one directional energy sweep; cards expose an energy rail rather than random particles.
- The UI must respect `prefers-reduced-motion`.

## Signature components
1. **Neon Reactor** — concentric rotating control rings driven by real configured-tweak coverage.
2. **Energy Field** — animated grid, circuit rails, and signal trace behind the application shell.
3. **Command Matrix** — Ctrl+K palette with indexed modules and a reactor header.
4. **Energy Rail Navigation** — fixed left control rail with moving active focus and core status.
5. **Signal Wave** — subtle animated SVG telemetry motif used in the command deck/top bar.
6. **Boot Sequence** — cinematic reactor activation splash with real loading/ready state.

## Anti-patterns
- No random rainbow colors.
- No generic glassmorphism blobs.
- No decorative 3D scene that consumes GPU for no product value.
- No fake CPU/FPS percentages.
- No confetti.
- No Mac-style dock magnification.
- No stock “AI dashboard” gradient cards.

## Performance budget
WebView2 should keep hardware acceleration enabled. Prefer CSS transforms/opacity for ambient effects and Motion for orchestrated React transitions. Infinite effects should use a small number of layers and must not cause React state updates per frame.
