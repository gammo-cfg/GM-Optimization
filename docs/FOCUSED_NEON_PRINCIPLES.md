# GM-Optimization — Focused Neon Principles

GM should feel unmistakable without making the user fight the interface.

## Core rule
Each screen gets **one dominant animated focal point**. Supporting content stays comparatively still, low contrast, and predictable.

## Motion hierarchy
1. **Primary motion** — one signature visual that expresses the page purpose (for example the dashboard reactor).
2. **State motion** — appears when something changes: scan, apply, benchmark, progress, success, warning.
3. **Interaction motion** — short hover/press/page-entry feedback.
4. **Atmosphere** — extremely low-contrast and slow. It must disappear perceptually when the user starts reading.

Never run several independent high-contrast animations in the same viewport.

## Color hierarchy
- Black/graphite owns the canvas.
- White carries readable content.
- Orange neon identifies focus, selection, progress, and the GM brand.
- Green, amber, and red are semantic only.
- Secondary content should not glow.

## Density
- Prefer one strong hero surface over many decorative cards.
- Combine related machine facts into strips or tables instead of separate cards.
- Limit primary choices on a screen to roughly three when possible.
- Use progressive disclosure for advanced controls.

## Dashboard
The reactor is the hero. Background movement, sidebar, top bar, hardware details, quick actions, and history must remain visually subordinate.

## Navigation
Navigation is stable. The active item may animate between routes, but idle navigation does not pulse, orbit, equalize, scan, or compete for attention.

## Background
The energy grid and ambient light may move slowly at low opacity. Do not add a permanent global scan beam, ECG trace, mouse spotlight, or other high-attention layer while normal content is visible.

## Panels
Panels use custom GM geometry and subtle orange edge energy. Avoid moving shine effects across every card. Hover feedback should be small and local.

## Accessibility and performance
Honor `prefers-reduced-motion`. Keep continuous effects primarily to transform/opacity and reserve expensive effects for brief transitions.
