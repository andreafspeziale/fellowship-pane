---
name: tdd
description: Build features or fix bugs test-first through a strict red-green loop and behavior-focused tests.
disable-model-invocation: true
---

# Test-Driven Development

TDD is the red to green implementation loop. This skill defines what makes a
test worth keeping, where tests belong, and how to keep each cycle narrow.

Before starting, inspect the repository's existing test layout, naming,
framework, helpers, and public interfaces. Follow those conventions rather than
introducing a parallel testing style.

## What a good test is

Tests verify behavior through public interfaces, not implementation details.
They should survive internal refactors and read like specifications of caller-
or user-visible capabilities.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for boundary
and test-double guidance.

## Agree the seams

A seam is the interface where a test observes behavior without reaching into
internals. Before writing tests, state which seams the change will exercise and
confirm them with the user. Do not spread coverage across every reachable
internal module.

When the interface itself is unresolved, read and apply
`../codebase-design/SKILL.md` before fixing the test surface.

## Anti-patterns

- **Implementation-coupled**: mocks internal collaborators, tests private
  methods, asserts call order, or observes behavior through a side channel.
- **Tautological**: computes the expected value using the same logic as the
  implementation instead of an independent example or contract.
- **Horizontal slicing**: writes all imagined tests first and implementation
  afterward. Work in vertical slices so each cycle learns from the previous one.
- **Speculative coverage**: adds cases or flexibility not required by the
  behavior currently being implemented.

## Rules of the loop

- **Red before green.** Write one failing behavior test first and verify that it
  fails for the expected reason.
- **Minimum green.** Add only enough behavior to pass that test.
- **One vertical slice at a time.** Complete one seam, one behavior, and one
  minimal implementation before selecting the next case.
- **No refactoring in the implementation loop.** Complete the smallest coherent
  vertical slice, then submit its diff to the normal review workflow. Apply
  structural improvements afterward while keeping all tests green.
