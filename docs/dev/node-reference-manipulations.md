# Node Reference Manipulation

This page documents how QGas tools create or modify node references in the
background.

## Nomenclature

- `a`, `b`, and `c` represent node IDs.
- `P(a → b)` represents a pipeline with `node_start = a` and `node_end = b`.
- `I(a)` represents an infrastructure element with `node = a`.
- `C(a → b)` represents an inline compressor with `node_start = a` and
  `node_end = b`.
- `∅` means that the corresponding element or reference does not exist.

Pipelines and inline infrastructure use `node_start` and `node_end`.
Infrastructure with a single connection uses `node`.

## Overview of reference manipulations

| Tool | Reference manipulation | Example |
| --- | --- | --- |
| Add Pipeline | Creates `node_start` and `node_end` | `∅ → P(a → b)` |
| Add Infrastructure | Creates `node`, or `node_start` and `node_end` for inline infrastructure | `∅ → I(a)` or `∅ → C(a → b)` |
| Reconnect Infrastructure | Replaces `node` | `I(a) → I(b)` |
| Divide Pipeline | Replaces one pipeline with two segments and inserts a node | `P(a → b) → P₁(a → v) + P₂(v → b)` |
| Create Compressor | Replaces a node or splits selected pipelines and connects their terminals to a central compressor | `P(a → b) → P₁(a → cₐ) + CP(cₐ → C) + CP(cᵇ → C) + P₂(cᵇ → b)` |
| Split Node | Reassigns selected pipeline endpoints from one node to separate subnodes | `b → b₁, b₂` |
| Change Direction | Swaps `node_start` and `node_end` | `P(a → b) → P(b → a)` |
| Edit Geometry | Does not change node references | `P(a → b) → P(a → b)` |

## Add Pipeline

When a pipeline is created, QGas assigns both endpoint references:

```text
Before: Nodes a and b, no pipeline

After:  P(node_start=a, node_end=b)
        a ─────────────────────→ b
```

For each endpoint, QGas either uses an existing node selected by the user or
creates a new node at the pipeline endpoint. Every new node is added to the
selected node layer and receives the same attribute schema and visual style as
the existing nodes in that layer. References belonging to other elements are
not changed. If exactly one endpoint node already exists, its `pressure_max`
and `pressure_min` values are copied to the newly created node at the opposite
endpoint.

## Add Infrastructure

A regular point infrastructure element receives the selected node in its
`node` field:

```text
Before: Infrastructure I(node=∅)
After:  Infrastructure I(node=a)
```

For inline infrastructure, QGas searches for nodes within 50 metres:

- If at least two nodes are found, it assigns `node_start=a` and `node_end=b`
  and clears `node`.
- If exactly one node is found, it assigns `node=a` and clears `node_start`
  and `node_end`.
- If no node is found, the reference fields remain empty.

The order of `node_start` and `node_end` follows the order of the nearby-node
search. QGas does not infer a network flow direction during this operation.

## Reconnect Infrastructure

This tool replaces only the `node` reference of the selected infrastructure
element:

```text
Before: I(node=a)
After:  I(node=b)
```

Node `a` is not deleted. Pipeline references and references belonging to other
infrastructure elements are not modified.

## Divide Pipeline

The original pipeline is removed and replaced with two new pipeline segments.
QGas creates a new node `v` at the selected division point:

```text
Before:

P(node_start=a, node_end=b)
a ─────────────────────────────→ b

After:

P₁(node_start=a, node_end=v)
P₂(node_start=v, node_end=b)
a ─────────────→ v ─────────────→ b
```

The first segment inherits `node_start=a` and receives `node_end=v`. The second
segment receives `node_start=v` and inherits `node_end=b`. Node `v` is created
in the node layer of the connected endpoint nodes and uses that layer's
attribute schema.

## Split Node

This tool separates the connections of one existing node without dividing the
pipelines themselves. Consider two paths that initially share node `b`:

```text
Before:

a ───────→ b ───────→ c
d ───────→ b ───────→ e

References:
P₁(a → b), P₂(b → c), P₃(d → b), P₄(b → e)
```

The user creates subnodes `b₁` and `b₂`. The pipelines belonging to the path
from `a` to `c` are assigned to `b₁`, while the pipelines belonging to the path
from `d` to `e` are assigned to `b₂`:

```text
After:

a ───────→ b₁ ───────→ c
d ───────→ b₂ ───────→ e

References:
P₁(a → b₁), P₂(b₁ → c), P₃(d → b₂), P₄(b₂ → e)
```

For every selected pipeline, QGas replaces only the endpoint that referenced
the original node:

- `node_start=b` becomes `node_start=b₁` or `node_start=b₂`.
- `node_end=b` becomes `node_end=b₁` or `node_end=b₂`.

The affected geometric pipeline endpoint is moved to the position of its new
subnode. Each subnode remains in the original node's layer and preserves its
attribute schema. Pipelines not assigned to a subnode keep their reference to
`b`.

## Change Direction

QGas swaps the start and end references and reverses the coordinate order of
the pipeline geometry:

```text
Before: node_start=a, node_end=b, geometry a → b
After:  node_start=b, node_end=a, geometry b → a
```

If the operation is discarded, QGas restores both references and the original
geometry.

## Edit Geometry

Editing geometry does not change `node`, `node_start`, or `node_end` reference
values. When a node is moved, its ID remains the same. QGas only moves the node
position and the geometric endpoints of pipelines that already reference it:

```text
References before: P(node_start=a, node_end=b)
References after:  P(node_start=a, node_end=b)

Only the position of `b` and the corresponding pipeline endpoint change.
```
