---
name: Waypoint
description: Precise navy and blue interfaces for connected delivery work.
colors:
  primary: "#1765ab"
  primary-hover: "#104e88"
  brand-navy: "#122e4c"
  brand-muted: "#bfcee0"
  background: "#ffffff"
  foreground: "#172b43"
  secondary: "#eef4fa"
  secondary-foreground: "#17446d"
  muted: "#f5f7fa"
  muted-foreground: "#58677a"
  destructive: "#b42332"
  error-background: "#fff0f1"
  border: "#dce3eb"
  input: "#8091a5"
  focus: "#2780c7"
typography:
  display:
    fontFamily: '"Public Sans Variable", "Public Sans", sans-serif'
    fontSize: "clamp(38px, 3.7vw, 58px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.036em"
  headline:
    fontFamily: '"Public Sans Variable", "Public Sans", sans-serif'
    fontSize: "34px"
    fontWeight: 620
    lineHeight: 1.25
    letterSpacing: "-0.032em"
  body:
    fontFamily: '"Public Sans Variable", "Public Sans", sans-serif'
    fontSize: "14px"
    lineHeight: 1.65
  label:
    fontFamily: '"Public Sans Variable", "Public Sans", sans-serif'
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.5
rounded:
  checkbox: "4px"
  control: "8px"
  logo: "10px"
  base: "0.65rem"
spacing:
  compact: "8px"
  control-gap: "10px"
  inset: "12px"
  group: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.control}"
    height: "50px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  text-action:
    textColor: "{colors.primary}"
    padding: "3px 0"
  input:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.control}"
    height: "50px"
    padding: "0 14px 0 44px"
  demo-role:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.control}"
    padding: "13px 12px"
  help-note:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.control}"
    padding: "14px"
---

# Design System: Waypoint

## Overview

Waypoint uses the approved navy and blue identity, Public Sans, precise borders, and restrained corners. The implemented interface puts readable task controls on light surfaces and uses the navy brand surface for recognition and context. This document records the current sign-in portal and role landing scaffolds; it does not imply a completed operational component library.

**Key Characteristics:**

- Clear labels and measured spacing.
- Blue actions against white surfaces.
- Navy brand context with lighter supporting text.
- Labeled icons and visible keyboard focus.

## Colors

### Primary

Action blue identifies the main action, text actions, selection, and input focus. Its deeper hover variant makes state changes visible. Brand navy anchors the identity surface; brand muted supports secondary text on it.

### Neutral

White is the form, card, and popover surface. Ink foreground carries main text; muted foreground carries supporting copy. Muted and secondary surfaces distinguish workspace and help regions. Border supplies subtle separators, while the stronger input stroke keeps fields recognizable.

Destructive red accompanies field error text. Failed sign-in uses a pale error surface and an alert icon. Color never replaces the message or selected-state indicator.

## Typography

Public Sans Variable, with Public Sans and sans-serif fallbacks, supplies every role. The interface uses sentence case and slightly tightened large headings; it has no separate decorative or monospace typeface.

Display is the brand-panel headline. Headline is the sign-in heading, reduced to (30px) on mobile. Body is supporting form copy; the brand introduction uses (16px) with (1.8) line height. Labels remain compact but distinct from placeholder text. Inputs increase to (16px) at the mobile breakpoint to support phone entry.

## Layout

The desktop portal uses a full-height two-column grid (0.95fr / 1.05fr). Its centered form is capped at (412px), growing to (440px) at the wide-screen breakpoint. Field groups use the group spacing token; demo role choices use a two-column grid with the control-gap token.

At (1100px), brand spacing and footer arrangement tighten. At (800px) and below, the brand panel disappears and the compact wordmark precedes the form. Side padding becomes (24px), then (18px) below (359px). Demo choices retain two columns; their trailing indicators disappear on the narrowest layout while text and role icons remain. The workspace scaffold caps its content at (820px) and changes its three-column details to a single column at the mobile breakpoint.

These compositions belong to the implemented surfaces. New surfaces should reuse their typography, spacing, and control language without copying the portal's split layout indiscriminately.

## Elevation & Depth

Most depth comes from contrasting surfaces and borders. The main button has a faint ambient shadow at rest and a slightly stronger hover shadow. Inputs are flat until focused, when a blue halo appears. The help dialog uses a fine ring, translucent overlay, and blur where supported. Exact shadows and motion values live in the sidecar.

Transitions are brief changes in color, border, and shadow. The pending spinner uses a linear rotation. Reduced-motion preferences shorten animation and transition durations and stop repeated animation.

## Shapes

Controls, demo choices, errors, and help notes share the control radius. The smaller checkbox and slightly larger logo tile provide appropriate exceptions. Workflow markers are circles linked by a fine line. The base radius feeds the scaffolded shadcn component scale; portal overrides are the source for its visible controls.

## Components

### Buttons

The primary action is a full-width, solid blue control with white text and a trailing icon; pending state replaces the icon with a spinner and disables submission. Text actions are compact blue labels with hover underlines. Workspace actions also use the existing outlined Button variant. Keep visible focus and disabled-state feedback.

### Inputs / Fields

White fields have a stronger border than surrounding separators, a leading icon, and an external label. Password entry adds a trailing visibility button with a (44px) hit area. Hover adjusts the stroke; focus adds a blue border and halo. Invalid state uses the component's destructive border treatment plus adjacent error text. Disabled fields inherit reduced opacity and the component's disabled surface treatment.

### Demo role choices

These are compact outlined buttons, not operational status cards. Each pairs a role icon with a title and short context. Selection adds blue stroke, a pale blue surface, and a check indicator; the pressed state and live announcement also communicate the selection.

### Help dialog and note

The existing dialog presents a heading, explanation, and tinted help note. Its portal-specific maximum width is (430px) with (26px) padding. Preserve the close control and keyboard dialog behavior supplied by Radix.

### Wordmark and workflow diagram

The wordmark pairs a blue Waypoints icon tile with a bold name and smaller delivery-planning descriptor. Its light variant adapts to navy. The lifecycle diagram uses labeled circular stops; it is explanatory content rather than interactive navigation.

## Do's and Don'ts

### Do:

- **Do** reuse Public Sans and the navy/blue identity.
- **Do** keep labels, messages, and icons alongside meaningful state colors.
- **Do** preserve visible focus and the mobile input size.
- **Do** document demo and scaffold boundaries clearly.

### Don't:

- **Don't** substitute a new palette or decorative font for the approved identity.
- **Don't** treat the lifecycle diagram as navigation or live delivery status.
- **Don't** describe unimplemented operational components as established patterns.
