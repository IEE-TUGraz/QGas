# Node Reference Manipulations

This page documents how QGas tools create or modify node references in the
background.

## Reference model and notation

- `A`, `B`, and `C` represent node IDs.
- `P(A → B)` represents a pipeline with `node_start = A` and `node_end = B`.
- `I(A)` represents an infrastructure element with `node = A`.
- `K(A → B)` represents an inline compressor with `node_start = A` and
  `node_end = B`.
- `∅` means that the corresponding element or reference does not exist.

Pipelines and inline infrastructure use `node_start` and `node_end`.
Infrastructure with a single connection uses `node`.

## Overview

| Tool | Reference manipulation | Example |
| --- | --- | --- |
| Add Pipeline | Creates `node_start` and `node_end` | `∅ → P(A → B)` |
| Add Infrastructure | Creates `node`, or `node_start` and `node_end` for inline infrastructure | `∅ → I(A)` or `∅ → K(A → B)` |
| Reconnect Infrastructure | Replaces `node` | `I(A) → I(B)` |
| Divide Pipeline | Replaces one pipeline with two segments and inserts a node | `P(A → B) → P₁(A → C) + P₂(C → B)` |
| Distribute Compressors | Splits a pipeline around a compressor using two connection nodes | `P(A → B) → P₁(A → C₁) + K(C₁ → C₂) + P₂(C₂ → B)` |
| Split Node | Reassigns selected pipeline endpoints from one node to separate subnodes | `B → B₁, B₂` |
| Change Direction | Swaps `node_start` and `node_end` | `P(A → B) → P(B → A)` |
| Edit Geometry | Does not change node references | `P(A → B) → P(A → B)` |

## Add Pipeline

When a pipeline is created, QGas assigns both endpoint references:

```text
Before: Nodes A and B, no pipeline

After:  P(node_start=A, node_end=B)
        A ─────────────────────▶ B
```

For each endpoint, QGas either uses an existing node selected by the user or
creates a new node at the pipeline endpoint. References belonging to other
elements are not changed.

## Add Infrastructure

A regular point infrastructure element receives the selected node in its
`node` field:

```text
Before: Infrastructure I(node=∅)
After:  Infrastructure I(node=A)
```

For inline infrastructure, QGas searches for nodes within 50 metres:

- If at least two nodes are found, it assigns `node_start=A` and `node_end=B`
  and clears `node`.
- If exactly one node is found, it assigns `node=A` and clears `node_start`
  and `node_end`.
- If no node is found, the reference fields remain empty.

The order of `node_start` and `node_end` follows the order of the nearby-node
search. QGas does not infer a network flow direction during this operation.

## Reconnect Infrastructure

This tool replaces only the `node` reference of the selected infrastructure
element:

```text
Before: I(node=A)
After:  I(node=B)
```

Node `A` is not deleted. Pipeline references and references belonging to other
infrastructure elements are not modified.

## Divide Pipeline

The original pipeline is removed and replaced with two new pipeline segments.
QGas creates a new node `C` at the selected division point:

```text
Before:

P(node_start=A, node_end=B)
A ─────────────────────────────▶ B

After:

P₁(node_start=A, node_end=C)
P₂(node_start=C, node_end=B)
A ─────────────▶ C ─────────────▶ B
```

The first segment inherits `node_start=A` and receives `node_end=C`. The second
segment receives `node_start=C` and inherits `node_end=B`.

## Distribute Compressors

When QGas inserts a distributed compressor into a pipeline, it creates two
separate connection nodes at the compressor location. The compressor remains a
distinct network element between these nodes:

```text
Before:

P(A → B)
A ─────────────────────────────────────▶ B

After:

P₁(A → C₁)       K(C₁ → C₂)       P₂(C₂ → B)
A ─────────▶ C₁ ──[ compressor ]──▶ C₂ ─────────▶ B
```

The resulting references are:

| Element | `node_start` | `node_end` |
| --- | --- | --- |
| First pipeline segment | `A` | `C₁` |
| Compressor | `C₁` | `C₂` |
| Second pipeline segment | `C₂` | `B` |

## Split Node

This tool separates the connections of one existing node without dividing the
pipelines themselves. Consider two paths that initially share node `B`:

```text
Before:

A ───────▶ B ───────▶ C
D ───────▶ B ───────▶ E

References:
P₁(A → B), P₂(B → C), P₃(D → B), P₄(B → E)
```

The user creates subnodes `B₁` and `B₂`. The pipelines belonging to the path
from `A` to `C` are assigned to `B₁`, while the pipelines belonging to the path
from `D` to `E` are assigned to `B₂`:

```text
After:

A ───────▶ B₁ ───────▶ C
D ───────▶ B₂ ───────▶ E

References:
P₁(A → B₁), P₂(B₁ → C), P₃(D → B₂), P₄(B₂ → E)
```

For every selected pipeline, QGas replaces only the endpoint that referenced
the original node:

- `node_start=B` becomes `node_start=B₁` or `node_start=B₂`.
- `node_end=B` becomes `node_end=B₁` or `node_end=B₂`.

The affected geometric pipeline endpoint is moved to the position of its new
subnode. Pipelines not assigned to a subnode keep their reference to `B`.

## Change Direction

QGas swaps the start and end references and reverses the coordinate order of
the pipeline geometry:

```text
Before: node_start=A, node_end=B, geometry A → B
After:  node_start=B, node_end=A, geometry B → A
```

If the operation is discarded, QGas restores both references and the original
geometry.

## Edit Geometry

Editing geometry does not change `node`, `node_start`, or `node_end` reference
values. When a node is moved, its ID remains the same. QGas only moves the node
position and the geometric endpoints of pipelines that already reference it:

```text
References before: P(node_start=A, node_end=B)
References after:  P(node_start=A, node_end=B)

Only the position of B and the corresponding pipeline endpoint change.
```
