# GM-Optimization visual system

## Product character

GM is a Windows performance utility, not a showcase site. The interface should feel precise, calm, technical, and trustworthy. Visual effects never outrank information hierarchy.

## Core rules

- Use a graphite/neutral surface system. Orange is a signal and action color, not a background theme.
- Prefer 1px strokes and restrained elevation over glow.
- Use one primary navigation model: the fixed left command rail.
- Use Segoe UI Variable/system UI for product text and Cascadia Code for technical values.
- Keep radii in the 6–12px range for ordinary controls and surfaces.
- Keep animation short and functional. Page transitions should communicate navigation; controls should not tilt, magnetize, or emit decorative particles.
- Use semantic colors only for status: green success, amber caution, red destructive/error.
- Never advertise an inferred or fabricated performance score as measured data.
- Destructive operations must be visibly distinct and require review when impact is broad.
- Empty, loading, error, and disabled states are part of the design system, not afterthoughts.

## Component hierarchy

### Shell
- Sidebar: `#0d1014`, 226px, grouped navigation.
- Top bar: 58px with page context and command launcher.
- Content: `#0b0d10` with 24–26px page gutters.

### Surfaces
- Standard panel: `#14171c`, 1px neutral stroke, 11px radius.
- Raised panel/dialog: `#181c22`, stronger stroke, 12px radius.
- Avoid background gradients inside ordinary cards.

### Accent
- Primary: `#f27622`.
- Use for primary actions, active navigation indicator, progress, and a few technical highlights.
- Do not add orange glows to ordinary cards or body backgrounds.

### Motion
- 120–200ms for interaction and route transitions.
- Prefer opacity/2–6px translation.
- Respect `prefers-reduced-motion`.

## Anti-patterns prohibited in GM

- Cursor-following spotlights.
- Decorative particle fields.
- Magnifying dock navigation.
- Card tilt/magnetism/ripple effects.
- Confetti for maintenance operations.
- Large blurred neon blobs as page decoration.
- Fake controls that do not change a real setting.
- Excessive pills/badges where plain text works better.
