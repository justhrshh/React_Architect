# MODULE_SPEC.md

> **React Architect Modular Construction System**
>
> This document defines the physical building blocks used throughout the entire experience.
>
> Every visible object in the introduction is constructed from these modules.
> No exceptions.

---

# Philosophy

We do not build scenes.

We build **systems**.

The experience should behave like a construction kit.

The same modules should be capable of becoming:

* Typography
* Architectural Artifact
* Portal
* Loading Animation
* Transition
* UI Motion Language

The user should never see new geometry appear.

Everything already exists.

It simply rearranges.

---

# Core Module Library

Only six module families exist.

These modules should be designed with architectural precision.

---

## Module A — Rail

Purpose

Primary structural member.

Represents support and connection.

Visual

* Long rectangular beam
* Rounded micro bevel
* Matte anodized aluminium
* Hollow center optional

Proportions

Length

100%

Width

12%

Height

12%

Rules

Can connect to:

* Joint
* Frame
* Node

Most common module.

Approximately 45–55% of all modules.

---

## Module B — Joint

Purpose

Connection point.

Every rail terminates at a joint.

Visual

Small mechanical connector.

Rounded edges.

Minimal detailing.

No visible screws.

Rules

Never floats alone.

Must connect two or more modules.

Approximately 20%.

---

## Module C — Frame

Purpose

Creates architectural boundaries.

Visual

Thin rectangular open frame.

No solid center.

Very lightweight.

Rules

Used to create:

* letters
* portal edges
* artifact silhouette

Approximately 10%.

---

## Module D — Plate

Purpose

Represents surfaces.

Visual

Thin architectural panel.

Dark smoked glass.

Very subtle transparency.

Rules

Never used as decoration.

Must imply usable architectural space.

Approximately 10%.

---

## Module E — Node

Purpose

Central anchor.

Visual

Circular or hexagonal precision hub.

Small emissive ring.

Rules

Used where multiple structural members converge.

Rare.

Approximately 3%.

---

## Module F — Core Ring

Purpose

Identity element.

Visual

Thin circular ring.

Minimal thickness.

Subtle emissive interior.

Rules

Never duplicated unnecessarily.

Only appears during major transitions.

Approximately 2%.

---

# Materials

Allowed

* Brushed aluminium
* Matte graphite
* Architectural glass
* Soft emissive lighting

Forbidden

* Plastic
* Chrome
* Neon
* Holograms
* Rust
* Cartoon materials

---

# Color Palette

Primary

Graphite

Dark aluminium

Charcoal

Secondary

Soft white

Low intensity blue emissive

Very subtle cyan highlights

Never use saturated colors.

---

# Geometry Rules

Every module should:

* Have clean topology.
* Use bevels.
* Avoid razor-sharp edges.
* Look manufactured.

Triangles are acceptable only where necessary.

No unnecessary subdivisions.

---

# Pivot Rules

Every module must have a meaningful pivot.

Rail

Center

Joint

Center

Frame

Center

Plate

Center

Node

Center

Consistent pivots simplify animation.

---

# Naming Convention

RA_Rail_Long_01

RA_Rail_Short_01

RA_Joint_01

RA_Frame_Rect_01

RA_Plate_Glass_01

RA_Node_01

RA_CoreRing_01

Never use generic names.

---

# Export Rules

Single GLB.

Separate meshes.

Shared materials.

Correct pivots.

Apply transforms.

Scale in meters.

Z Forward.

Y Up.

No embedded cameras.

No embedded lights.

---

# Instancing Strategy

Every module becomes an instance.

Example

Rail

↓

50 instances

Joint

↓

30 instances

Frame

↓

18 instances

Plate

↓

12 instances

Node

↓

8 instances

Core Ring

↓

2 instances

The scene should rarely exceed 150 total instances.

---

# Layout System

Every module belongs to multiple layouts.

Example

Module_042

textLayout

↓

position

rotation

scale

artifactLayout

↓

position

rotation

scale

portalLayout

↓

position

rotation

scale

GSAP interpolates between layouts.

No mesh replacement.

---

# Connection Rules

Rails connect only to:

* Joint
* Node

Frames connect to:

* Rails
* Plates

Plates connect to:

* Frames

Nodes connect to:

* Rails
* Core Ring

These rules should remain visually consistent.

---

# Animation Rules

Movement must feel engineered.

Use

* Translation
* Rotation
* Compression
* Expansion
* Alignment

Avoid

* Random jitter
* Excessive bounce
* Elastic motion
* Cartoon easing

Everything should have believable mechanical inertia.

---

# Performance Budget

Target

60 FPS

Desktop

<150 draw calls

Minimal material count

Instancing wherever possible

Avoid expensive post-processing.

Lighting should carry the premium feel instead of heavy effects.

---

# Future Expandability

The same module system should later build:

* Loading indicators
* Empty states
* Success animations
* Navigation transitions
* Background motion
* Product illustrations

No new visual language should be introduced.

Everything grows from this construction kit.

---

# Final Rule

If a new object cannot be created using the existing module library, question the design before creating a new mesh.

The strength of React Architect is not in having many assets.

It is in expressing many ideas with the same carefully designed pieces.
