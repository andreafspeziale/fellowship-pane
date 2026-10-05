---
name: grilling
description: Relentlessly grill the user about a plan, decision, or idea until reaching shared understanding.
disable-model-invocation: true
---

Map the topic as a decision tree and resolve one decision at a time.

Before asking, investigate every fact available through the current session's
tools. Ask the user only for decisions.

For each question:

- ask exactly one decision;
- ask it only when its prerequisite decisions are settled;
- when several questions are available, choose the one that removes the most
  downstream uncertainty;
- provide a recommended answer and rationale;
- wait for the user's answer before continuing.

After each answer, update the decision tree and reconsider what remains.

Stop when no meaningful branch remains unresolved. Summarize the shared
understanding and do not act on it until the user confirms.
