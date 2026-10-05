---
name: codebase-design
description: Design or reshape deep modules, their interfaces, and their seams while preserving existing repository conventions.
disable-model-invocation: true
---

# Codebase Design

Design deep modules: substantial behavior behind a small interface, placed at a
clean seam and testable through that interface. Optimize for leverage for
callers, locality for maintainers, and testability for both.

## Start from context

For brownfield work, inspect similar modules, callers, tests, and documented
conventions before designing anything. Existing canonical patterns are
constraints and the default choice. Introduce a different shape only when the
existing pattern demonstrably fails the new requirements.

For greenfield work, derive the first modules and seams from concrete use cases,
constraints, and expected variation. Do not add flexibility without a current
need.

## Vocabulary

Use these terms consistently:

- **Module**: anything with an interface and an implementation, at any scale.
- **Interface**: everything a caller must know to use the module correctly,
  including types, invariants, ordering, errors, configuration, and relevant
  performance characteristics.
- **Implementation**: behavior hidden inside the module.
- **Depth**: leverage at the interface. A deep module hides substantial behavior
  behind a small interface; a shallow module exposes nearly as much complexity
  as it contains.
- **Seam**: a place where behavior can change without editing the caller.
- **Adapter**: a concrete implementation occupying a seam.
- **Leverage**: capability callers gain per unit of interface they must learn.
- **Locality**: change, bugs, knowledge, and verification concentrated in one
  place rather than spread across callers.

## Principles

- **Existing patterns first.** Consistency with the repository beats a locally
  clever design unless the established pattern cannot meet the requirements.
- **Depth belongs to the interface.** Internal composition does not make a
  module shallow when callers see one small, coherent interface.
- **Deletion test.** Imagine deleting the module. If complexity disappears, it
  was likely pass-through indirection. If complexity spreads into callers, the
  module was providing leverage and locality.
- **The interface is the test surface.** Callers and tests should cross the same
  seam. A need to test past it is evidence that the module may have the wrong
  shape.
- **A seam needs real variation.** One adapter is hypothetical flexibility; two
  justified adapters make the seam real.
- **Hide complexity rather than exporting configuration.** Prefer fewer entry
  points, simpler parameters, explicit invariants, and useful defaults.

## Designing for testability

- Accept true external dependencies instead of constructing them internally.
- Return observable results where possible instead of exposing internal state.
- Keep the public surface smaller than the behavior behind it.
- Prefer local substitutes for infrastructure when they exercise the real
  interface faithfully.

Read [DEEPENING.md](DEEPENING.md) when consolidating existing modules or placing
a seam around dependencies.

Read [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md) when an interface is consequential,
expensive to change, or has multiple plausible shapes. Skip it for routine work
that already has a canonical local pattern.
