// Dafny refinement for `{{spec_name}}`.
//
// What goes here
// --------------
//   - Concrete data types that *refine* the abstract TLA+ state variables.
//   - Method/function signatures with `requires` / `ensures` that mirror
//     the TLA+ invariants and operator preconditions.
//   - A `RefinementMap` (informal or via ghost code) showing how each
//     concrete state maps back to an abstract TLA+ state.
//
// What does *not* go here
// -----------------------
//   - Performance optimisations.
//   - I/O, networking, persistence — those belong in the implementation.

module {{spec_name}} {

  // datatype State = State(/* fields */)

  // predicate Inv(s: State) { true }

  // method Step(s: State) returns (s': State)
  //   requires Inv(s)
  //   ensures  Inv(s')
  // {
  //   s' := s;
  // }
}
