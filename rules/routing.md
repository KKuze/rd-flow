# Routing

When a new request arrives at the discovery skill, decide:

1. **Is this a new feature or a change to an existing one?**
   - New → create a fresh spec workspace (`rd-flow spec new <name>`).
   - Change → identify the existing spec by name; resume at its current phase.

2. **Is the request narrow enough for one spec?**
   - One spec covers one coherent invariant family.
   - If the request spans unrelated invariants, split it first.

3. **Output**
   - The chosen spec name.
   - The intended starting phase (usually `requirements`).
   - Anything the user must answer before phase work begins.
