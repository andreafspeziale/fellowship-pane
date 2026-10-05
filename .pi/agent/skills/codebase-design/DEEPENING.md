# Deepening

Use the vocabulary in [SKILL.md](SKILL.md) to deepen a cluster of shallow
modules without exposing their dependencies through the new interface.

## Dependency categories

Classify each dependency before deciding where a seam belongs.

### 1. In-process

Pure computation or in-memory state with no I/O. Consolidate the modules and
test through the new interface directly. No adapter is needed.

### 2. Local-substitutable

Infrastructure with a faithful local stand-in, such as an in-memory filesystem
or local database. Keep the seam internal and test the deep module with the
stand-in. Do not expose the test mechanism through the public interface.

### 3. Remote but owned

A service your organization controls across a network or process boundary.
Define a port only when production and test adapters are both justified. Keep
business behavior in the deep module and inject the transport adapter.

### 4. Truly external

A third-party service outside your control. Inject a narrow port representing
the capability the module needs. Tests use a fake or mock adapter; production
uses the real integration.

## Seam discipline

- Do not introduce a port merely to wrap one implementation.
- Keep internal test seams out of the public interface.
- Put policy in the deep module and transport details in adapters.
- Preserve an established repository seam when it already fits the requirement.

## Testing strategy

- Test observable outcomes through the new interface.
- Replace superseded tests of shallow internals instead of layering duplicate
  coverage indefinitely.
- Keep tests stable across internal refactors.
- If a test must know internal ordering or state, reconsider the interface or
  seam before adding more test hooks.
