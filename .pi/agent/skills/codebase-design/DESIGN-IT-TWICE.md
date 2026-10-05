# Design It Twice

Use this only when an interface is consequential, expensive to change, or has
multiple plausible shapes. The goal is to avoid adopting the first idea through
inertia, not to manufacture options for routine work.

## 1. Frame the problem

State:

- the callers and use cases the interface must serve;
- invariants, errors, ordering, and performance constraints;
- dependencies and their category from [DEEPENING.md](DEEPENING.md);
- existing repository patterns that constrain the design;
- what the implementation should hide.

Resolve missing decisions with the user before designing alternatives.

## 2. Produce alternatives visibly

In the current session, produce at least two materially different interfaces.
Useful contrasting constraints are:

- smallest coherent interface and maximum leverage;
- simplest experience for the most common caller;
- additional flexibility only when a current requirement needs it;
- a different seam placement when deployment or dependency ownership makes it
  plausible.

For each alternative show:

1. interface, including non-type-level obligations;
2. one representative caller;
3. complexity hidden by the implementation;
4. dependency and adapter strategy;
5. concrete trade-offs and failure modes.

## 3. Compare and recommend

Compare the alternatives by:

- consistency with existing repository patterns;
- interface size and depth;
- locality of future changes;
- seam placement;
- caller ergonomics;
- test surface;
- cost of changing the decision later.

Recommend one design. Propose a hybrid only when it is simpler than both source
designs rather than an accumulation of their features.

Do not implement until the user accepts the selected direction.
