---
name: improve-codebase-architecture
description: Find and evaluate opportunities to deepen a codebase's modules, improve locality, and make behavior easier to test.
disable-model-invocation: true
---

# Improve Codebase Architecture

Read and apply `../codebase-design/SKILL.md` before starting. Use its vocabulary
and follow its references when evaluating dependencies or alternative
interfaces.

## 1. Choose the scope

If the user named a module, subsystem, or pain point, use that scope. Otherwise,
inspect a useful stretch of recent history to identify files and areas that
change repeatedly. Widen the scan only when no meaningful hotspot emerges.

Read relevant code, callers, tests, and existing documentation directly in this
session. Existing glossaries and ADRs may be evidence when present, but never
require or create them for this workflow.

## 2. Explore

Look for friction such as:

- understanding one behavior requires traversing many shallow modules;
- interfaces expose nearly as much complexity as their implementations;
- related changes repeatedly scatter across callers;
- policy leaks through transport or infrastructure seams;
- tests depend on internals or cannot exercise behavior through one interface;
- modules exist mainly to pass data or calls onward;
- an established repository pattern is being applied where its original
  assumptions no longer hold.

Inspect relevant callers before judging a candidate. Apply the deletion test
and classify its dependencies using `../codebase-design/DEEPENING.md`.

## 3. Present candidates

Write a self-contained HTML report to the OS temporary directory and open it for
the user. Use a fresh `architecture-review-<timestamp>.html` filename and follow
[HTML-REPORT.md](HTML-REPORT.md).

For each candidate include:

- files and callers involved;
- the current interface and where complexity leaks;
- the proposed deepening in plain English;
- expected leverage, locality, and testing gains;
- dependency category and seam implications;
- recommendation strength: `Strong`, `Worth exploring`, or `Speculative`;
- a before/after visual.

End with one top recommendation. Do not propose detailed interfaces yet.
Ask which candidate the user wants to explore.

## 4. Resolve the design

After the user selects a candidate, read and apply `../grilling/SKILL.md` to
resolve constraints and decisions one at a time.

If the interface has multiple consequential shapes, follow
`../codebase-design/DESIGN-IT-TWICE.md` in this visible session.

Do not edit the code until the user confirms the chosen direction.
