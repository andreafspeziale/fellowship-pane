# HTML Report

Create one static, self-contained HTML file. Use inline CSS and inline SVG or
ordinary HTML boxes and arrows. Do not depend on CDNs, JavaScript frameworks, or
assets outside the file.

## Structure

1. Header with repository name, date, and a compact visual legend.
2. One card per deepening candidate.
3. One final top-recommendation card linking to the strongest candidate.

Each candidate card contains:

- short title naming the deepening;
- recommendation-strength badge;
- dependency-category badge;
- monospaced file and caller list;
- side-by-side before and after diagrams;
- one-sentence problem;
- one-sentence proposed change;
- short bullets for leverage, locality, and test impact.

## Visual patterns

Choose the smallest visual that makes the structural change clear:

- boxes and arrows for call or dependency flow;
- stacked bands for shallow pass-through modules;
- interface/implementation rectangles for depth;
- a call tree collapsed into one deep module;
- red lines for leakage across a seam;
- faded boxes for behavior moved behind an interface.

Keep diagrams understandable without prose. Prefer CSS layout and labels; use
inline SVG only when lines or arrows materially help.

## Style

- Keep the report readable without horizontal scrolling.
- Use generous whitespace and one restrained accent color.
- Reserve red for leakage or risk and amber for uncertainty.
- Keep diagrams around 320px tall.
- Use semantic HTML and sufficient color contrast.
- Include no interactive behavior unless plain HTML disclosure elements are
  genuinely useful.

## Tone

Use concise, concrete language. Name modules, interfaces, implementations,
seams, adapters, leverage, and locality consistently. Avoid generic claims such
as "cleaner" or "more maintainable" when the concrete structural gain can be
named.
