---
name: Waypoint Operations
description: A calm logistics interface built from deep teal, turquoise, orange-red, amber, and orange.
theme: light-and-dark
font:
  family: '"Public Sans Variable", "Public Sans", system-ui, sans-serif'
  numericVariant: tabular-nums
colors:
  light:
    background: "#FAFAF9"
    foreground: "#29363B"
    card: "#FFFFFF"
    card-foreground: "#29363B"
    popover: "#FFFFFF"
    popover-foreground: "#29363B"
    primary: "#15576C"
    primary-foreground: "#FFFFFF"
    primary-hover: "#0E4558"
    secondary: "#E8F6F3"
    secondary-foreground: "#075E57"
    muted: "#F2F4F2"
    muted-foreground: "#607074"
    accent: "#FFF1D6"
    accent-foreground: "#674100"
    destructive: "#C93800"
    destructive-foreground: "#FFFFFF"
    border: "#DEE4E2"
    input: "#AAB7B5"
    ring: "#08796F"
  dark:
    background: "#081319"
    foreground: "#F3F7F6"
    card: "#0F2027"
    card-foreground: "#F3F7F6"
    popover: "#13262E"
    popover-foreground: "#F3F7F6"
    primary: "#49B8D0"
    primary-foreground: "#061A20"
    primary-hover: "#69C8DA"
    secondary: "#12332F"
    secondary-foreground: "#93E2D8"
    muted: "#132229"
    muted-foreground: "#AEBDB9"
    accent: "#3A2B0C"
    accent-foreground: "#FFD879"
    destructive: "#FF7043"
    destructive-foreground: "#321A0F"
    border: "#2B4149"
    input: "#52666C"
    ring: "#31C3B1"
radius:
  control: "8px"
  card: "12px"
  panel: "16px"
  pill: "999px"
spacing:
  unit: "4px"
  control-gap: "8px"
  card-padding: "20px"
  section-gap: "24px"
  page-padding: "32px"
---

# Waypoint Operations Design System

## 1. Design direction

The interface should feel calm, capable, and operational. The attached reference palette is used as a family rather than copying every swatch into every screen:

- **Deep teal-blue** anchors navigation and primary actions.
- **Turquoise** communicates positive state and secondary emphasis.
- **Orange-red** marks critical failures and destructive actions.
- **Amber** marks warnings, delivery-window risk, and attention.
- **Orange** adds brand energy and provides a fifth chart series.

Light mode uses warm white surfaces and quiet grey-green borders. Dark mode is not a simple inversion: it uses blue-charcoal surfaces with brighter versions of the same palette so controls and data remain readable.

The system is designed for dense Dispatcher workflows: tables, run builders, maps, alerts, timelines, capacity bars, and status panels. It should not look like a marketing site or a collection of oversized dashboard cards.

## 2. Core principles

1. **Operational clarity first.** Use color to support labels, not replace them.
2. **One dominant action.** Each page or panel has one visually primary action.
3. **Dense but breathable.** Use compact controls and tables with clear section spacing.
4. **Stable hierarchy.** Navigation, filters, status, and actions remain in predictable positions.
5. **Accessible in both themes.** Every text/background pair must meet WCAG AA; state must include text or an icon.
6. **Consistent semantics.** A warning is amber everywhere; orange is not reused as an unrelated selection state.

## 3. Brand palette

These are the image-inspired source colors. They are used directly for charts and adjusted into accessible semantic tokens for interface states.

| Name | Hex | Intended role |
|---|---:|---|
| Orange-red | `#FF4B0A` | Chart series, brand energy, critical-family hue |
| Turquoise | `#089B8C` | Chart series, positive-family hue, secondary emphasis |
| Deep teal-blue | `#15576C` | Primary light-theme action and navigation anchor |
| Amber | `#FFB703` | Chart series and warning-family hue |
| Orange | `#FF9700` | Chart series and secondary attention hue |

Do not use the raw palette automatically for body text or buttons. The semantic tokens below have been darkened or brightened where needed for contrast.

## 4. Light theme

### 4.1 Foundation

| Token | Value | Use |
|---|---:|---|
| `background` | `#FAFAF9` | Main application canvas |
| `surface` / `card` | `#FFFFFF` | Cards, tables, top bar, dialogs |
| `surface-subtle` / `muted` | `#F2F4F2` | Table headers, grouped controls, hover rows |
| `surface-raised` | `#FFFFFF` | Drawers and popovers with shadow |
| `foreground` | `#29363B` | Primary text |
| `foreground-muted` | `#607074` | Supporting text and metadata |
| `foreground-subtle` | `#7A898B` | Disabled or low-priority information |
| `border` | `#DEE4E2` | Card and table separators |
| `border-strong` / `input` | `#AAB7B5` | Form-control outline |

### 4.2 Actions and states

| Token | Value | Foreground | Use |
|---|---:|---:|---|
| `primary` | `#15576C` | `#FFFFFF` | Main action, selected navigation, active links |
| `primary-hover` | `#0E4558` | `#FFFFFF` | Hover/pressed action |
| `focus` | `#08796F` | n/a | Focus ring and keyboard emphasis |
| `success` | `#08796F` | `#FFFFFF` | Confirmed success when a filled treatment is needed |
| `success-surface` | `#E8F6F3` | `#075E57` | Success banners, checks, valid constraints |
| `warning` | `#B86A00` | `#FFFFFF` | Warning icon or compact filled badge |
| `warning-surface` | `#FFF1D6` | `#674100` | Delivery-window risk, capacity approaching limit |
| `critical` / `destructive` | `#C93800` | `#FFFFFF` | Critical exception and destructive confirmation |
| `critical-surface` | `#FFF0E9` | `#8E2900` | Failure banner, invalid state, blocking constraint |
| `info-surface` | `#E8F2F5` | `#15576C` | Neutral operational guidance |

The primary/white contrast is approximately `8.0:1`; success/white and critical/white are above `5:1`. Amber surfaces always use dark brown text, never white.

### 4.3 Light-theme composition

- App canvas: `background`.
- Top bar and tables: white `card` surfaces with a single bottom border.
- Sidebar: `#103F4F`; active item `#15576C`; inactive text `#C7D5D7`.
- Selected row: `#E8F2F5` with a `primary` left indicator.
- Hover row: `#F5F7F5`.
- Disabled control: `#EEF1EF` surface with `#7A898B` text.
- Map chrome: white surface at 92-96% opacity with a subtle shadow.

## 5. Dark theme

### 5.1 Foundation

| Token | Value | Use |
|---|---:|---|
| `background` | `#081319` | Main application canvas |
| `surface` / `card` | `#0F2027` | Cards, tables, top bar |
| `surface-subtle` / `muted` | `#132229` | Table headers and grouped regions |
| `surface-raised` / `popover` | `#13262E` | Drawers, menus, dialogs |
| `foreground` | `#F3F7F6` | Primary text |
| `foreground-muted` | `#AEBDB9` | Supporting text |
| `foreground-subtle` | `#849692` | Disabled/low-priority text |
| `border` | `#2B4149` | Separators and card outlines |
| `border-strong` / `input` | `#52666C` | Form-control outline |

### 5.2 Actions and states

| Token | Value | Foreground | Use |
|---|---:|---:|---|
| `primary` | `#49B8D0` | `#061A20` | Main dark-theme action and selection |
| `primary-hover` | `#69C8DA` | `#061A20` | Hover/pressed action |
| `focus` | `#31C3B1` | n/a | Focus ring |
| `success` | `#31C3B1` | `#082A25` | Confirmed success |
| `success-surface` | `#12332F` | `#93E2D8` | Success banner/background |
| `warning` | `#FFC247` | `#362600` | Warning badge or icon |
| `warning-surface` | `#3A2B0C` | `#FFD879` | Warning panel/background |
| `critical` / `destructive` | `#FF7043` | `#321A0F` | Critical/destructive action |
| `critical-surface` | `#3C1D14` | `#FFAD91` | Failure panel/background |
| `info-surface` | `#15313B` | `#9DD8E4` | Neutral operational guidance |

The dark canvas is blue-charcoal instead of pure black to reduce glare. Cards are separated by surface change plus border, not heavy shadows. Bright state colors should occupy small areas; large panels use the darker state surfaces.

### 5.3 Dark-theme composition

- Sidebar: `#061015`; active item `#143845`; inactive text `#AEBDB9`.
- Selected row: `#15313B` with a `primary` left indicator.
- Hover row: `#14262D`.
- Table header: `#132229`.
- Map chrome: `#0F2027` at 94-96% opacity.
- Charts use the dark data palette in Section 7 rather than light-theme swatches.

## 6. Typography

### 6.1 Font choice

Use **Public Sans Variable** throughout:

```css
font-family: "Public Sans Variable", "Public Sans", system-ui, -apple-system,
  "Segoe UI", sans-serif;
```

Why it fits:

- Highly legible at small sizes and in dense tables.
- Neutral and professional without feeling generic or decorative.
- Clear numerals and punctuation for IDs, times, weights, volumes, and ETAs.
- Already installed in the project, so no extra request or layout shift is introduced.

Use `font-variant-numeric: tabular-nums` for KPIs, tables, capacities, times, and IDs containing aligned numerals. A separate display font is unnecessary.

### 6.2 Type scale

| Style | Size / line height | Weight | Use |
|---|---|---:|---|
| Display | `32px / 40px` | 650 | Sign-in or rare product-level heading |
| Page title | `28px / 36px` | 650 | Main page heading |
| Section title | `20px / 28px` | 620 | Major content section |
| Card title | `16px / 24px` | 600 | Cards, panels, drawers |
| Body | `14px / 21px` | 400 | Default interface copy |
| Body strong | `14px / 21px` | 600 | Important values and row identity |
| Label | `12px / 16px` | 600 | Field labels and table headers |
| Caption | `11px / 16px` | 450 | Timestamps, helper text, metadata |

Rules:

- Use sentence case for headings and controls.
- Use letter spacing only for small uppercase labels: `0.04em` maximum.
- Keep table content at 12-14px; never shrink operational data below 11px.
- Use weight, spacing, and placement before adding another text color.

## 7. Data visualization palette

### 7.1 Light charts

| Series | Color |
|---:|---:|
| 1 | `#FF4B0A` |
| 2 | `#089B8C` |
| 3 | `#15576C` |
| 4 | `#FFB703` |
| 5 | `#FF9700` |
| 6+ | Use patterns, direct labels, or a neutral comparison series `#7D8C8F` |

### 7.2 Dark charts

| Series | Color |
|---:|---:|
| 1 | `#FF7043` |
| 2 | `#31C3B1` |
| 3 | `#49B8D0` |
| 4 | `#FFC247` |
| 5 | `#FFA32B` |
| 6+ | Use patterns, direct labels, or `#A7B4B2` |

### 7.3 Chart rules

- Keep series color assignments stable within a page and legend.
- Prefer direct labels over legends when there are five or fewer series.
- Use deep teal for totals/baselines; do not always reserve the first series for danger.
- Status charts must use semantic colors instead of the categorical series order.
- Grid lines: `#E6EAE8` light, `#263A42` dark.
- Axis text: muted foreground; chart titles use normal foreground.
- Tooltips use popover tokens and show units.
- Use patterns, marker shapes, labels, or line styles so meaning survives color-vision differences and monochrome export.
- Avoid pie/donut charts when a sorted bar, stacked bar, or exact table communicates the comparison more clearly.

## 8. Spacing, shape, and elevation

### 8.1 Spacing

Use a 4px base grid:

`4, 8, 12, 16, 20, 24, 32, 40, 48`

- Page padding: 32px desktop, 24px tablet, 16-20px phone.
- Section gap: 24-32px.
- Card padding: 20-24px.
- Dense table cells: 10-12px vertical, 12-16px horizontal.
- Control gap: 8-12px.

### 8.2 Shape

- Inputs and buttons: 8px.
- Cards/tables: 12px.
- Drawers/dialogs: 16px on floating edges.
- Status chips: 999px only for short labels.
- Checkboxes: 4px.
- Do not round every nested container; hierarchy should come from spacing and separators.

### 8.3 Elevation

- Cards inside the page use border only.
- Popovers: `0 8px 24px rgba(7, 26, 32, 0.14)` light; `0 12px 32px rgba(0, 0, 0, 0.38)` dark.
- Drawers/dialogs: `0 18px 60px rgba(7, 26, 32, 0.22)` light; `0 18px 60px rgba(0, 0, 0, 0.55)` dark.
- Avoid shadows on every KPI or table row.

## 9. Component styling

### 9.1 Buttons

**Primary**

- Filled `primary`, themed foreground, 40-44px height, 8px radius.
- Use once per page header or once per focused panel.

**Secondary**

- Light: `secondary` background with `secondary-foreground`.
- Dark: dark teal secondary surface with mint text.

**Outline**

- Transparent background, strong border, normal foreground.
- Hover uses muted surface.

**Destructive**

- Use filled critical only in confirmation context; default destructive entry points may be outline/text.

**Icon button**

- 40x40px minimum; icon is 18-20px.
- Always has an accessible name and visible focus ring.

### 9.2 Inputs and filters

- 40px desktop height; 44px on touch screens.
- External label, visible value, and optional helper/error below.
- Focus: 2px `ring` with 2px offset in the page background color.
- Invalid: critical border plus explicit message and icon.
- Placeholder is not a label.
- Multi-filter toolbars use a quiet card/surface and show active filters as removable chips.

### 9.3 Navigation

- Sidebar uses the deepest teal surface in light mode and the darkest blue-charcoal in dark mode.
- Active item has a filled selected surface, a 3px left indicator, icon, label, and `aria-current`.
- Use count badges only for unresolved/actionable work.
- Top bar uses the normal card surface with one bottom border.

### 9.4 Cards and KPI tiles

- White/dark-card surface, 1px border, 12px radius.
- KPI cards are compact and clickable only when they navigate or filter.
- Value uses Page title or Section title scale depending on density.
- A 3-4px top/left semantic rail may show risk; do not fill the entire card bright orange/red unless blocking.

### 9.5 Tables

- Sticky muted header, visible row separators, tabular numerals.
- Default row height 48-56px.
- Selected row uses selection surface plus left indicator and checkbox.
- Hover state must differ from selected state.
- Keep identity and status columns pinned in wide data grids.
- Critical row information is written in text; a colored dot is insufficient.

### 9.6 Status chips

Use soft surfaces for routine statuses and stronger filled colors only for high-priority badges.

| Status | Light | Dark |
|---|---|---|
| On schedule / valid | success surface + success text | dark success surface + mint text |
| At risk / loading issue | warning surface + warning text | dark warning surface + amber text |
| Critical / failed | critical surface + critical text | dark critical surface + coral text |
| Active / selected | info surface + primary text | dark info surface + light blue text |
| Neutral / draft | muted surface + muted text | muted surface + muted text |

Every chip includes a word label. Add an icon where the state must be recognized quickly.

### 9.7 Alerts and exceptions

- Use a 4px semantic left border, soft semantic surface, icon, title, explanation, and action.
- Warning/critical panels show the cause and the next action, not only `Something went wrong`.
- Critical banners may remain sticky until acknowledged or resolved.

### 9.8 Progress and capacity

- Track: border/muted surface.
- Normal fill: primary.
- 80-89%: amber family; 90-100%: orange; above 100%: critical.
- Always show exact used/capacity and percentage.
- Weight, volume, time, and fuel are separate bars; never collapse them into a single score.

### 9.9 Maps and timelines

- Selected route: primary; other routes: muted slate at lower opacity.
- Completed stop: success; next stop: primary; risk: warning; failed: critical.
- Number markers so the map matches the stop table/timeline.
- Provide a non-map list/table equivalent.

### 9.10 Dialogs and drawers

- Dialogs are for short, focused confirmation or data entry.
- Drawers preserve list/table context while showing details.
- Header and footer remain sticky for long drawers.
- Primary and destructive confirmation actions include the affected entity in the copy.

## 10. Theme implementation tokens

The following variables are compatible with the existing Tailwind/shadcn mapping in `globals.css`.

```css
:root {
  color-scheme: light;

  --background: #fafaf9;
  --foreground: #29363b;
  --card: #ffffff;
  --card-foreground: #29363b;
  --popover: #ffffff;
  --popover-foreground: #29363b;

  --primary: #15576c;
  --primary-foreground: #ffffff;
  --secondary: #e8f6f3;
  --secondary-foreground: #075e57;
  --muted: #f2f4f2;
  --muted-foreground: #607074;
  --accent: #fff1d6;
  --accent-foreground: #674100;
  --destructive: #c93800;
  --destructive-foreground: #ffffff;

  --border: #dee4e2;
  --input: #aab7b5;
  --ring: #08796f;
  --radius: 0.75rem;

  --success: #08796f;
  --success-foreground: #ffffff;
  --success-surface: #e8f6f3;
  --warning: #b86a00;
  --warning-foreground: #ffffff;
  --warning-surface: #fff1d6;
  --critical-surface: #fff0e9;
  --info-surface: #e8f2f5;

  --brand-red-orange: #ff4b0a;
  --brand-turquoise: #089b8c;
  --brand-deep-teal: #15576c;
  --brand-amber: #ffb703;
  --brand-orange: #ff9700;
  --brand-navy: #103f4f;
}

.dark {
  color-scheme: dark;

  --background: #081319;
  --foreground: #f3f7f6;
  --card: #0f2027;
  --card-foreground: #f3f7f6;
  --popover: #13262e;
  --popover-foreground: #f3f7f6;

  --primary: #49b8d0;
  --primary-foreground: #061a20;
  --secondary: #12332f;
  --secondary-foreground: #93e2d8;
  --muted: #132229;
  --muted-foreground: #aebdb9;
  --accent: #3a2b0c;
  --accent-foreground: #ffd879;
  --destructive: #ff7043;
  --destructive-foreground: #321a0f;

  --border: #2b4149;
  --input: #52666c;
  --ring: #31c3b1;

  --success: #31c3b1;
  --success-foreground: #082a25;
  --success-surface: #12332f;
  --warning: #ffc247;
  --warning-foreground: #362600;
  --warning-surface: #3a2b0c;
  --critical-surface: #3c1d14;
  --info-surface: #15313b;

  --brand-red-orange: #ff7043;
  --brand-turquoise: #31c3b1;
  --brand-deep-teal: #49b8d0;
  --brand-amber: #ffc247;
  --brand-orange: #ffa32b;
  --brand-navy: #061015;
}
```

Theme selection should support `light`, `dark`, and `system`. Store an explicit user choice; when set to system, react to `prefers-color-scheme`. Apply the theme class before first paint to prevent a flash of the wrong theme.

## 11. Motion and interaction

- Color, border, opacity, and shadow transitions: 120-180ms.
- Drawer/dialog entry: 180-220ms.
- Avoid animating table reordering while a user is reading or selecting rows.
- Loading spinners are used only when progress cannot be estimated; skeletons preserve page structure.
- Respect `prefers-reduced-motion`; remove repeated animation and shorten transitions.

## 12. Accessibility checklist

- Text contrast: 4.5:1 minimum; large text/UI boundaries: 3:1 minimum.
- Keyboard focus is always visible in both themes.
- Touch targets are at least 44x44px on phone/tablet.
- Color is paired with label, icon, pattern, or shape.
- Charts have direct values, legends, and an accessible table or summary.
- Tables use proper headers, captions where needed, and logical focus order.
- Errors are adjacent to their field and announced to assistive technology.
- Map-only information is duplicated in a list/timeline.
- Theme switching never changes the semantic meaning of a color.

## 13. Do and do not

### Do

- Use deep teal-blue for primary hierarchy and navigation.
- Use turquoise for positive states and secondary emphasis.
- Use amber/orange for attention in small, purposeful areas.
- Keep bright colors strongest in charts, markers, badges, and key actions.
- Use Public Sans and tabular numerals for operational data.
- Test every component in both themes, including hover, focus, disabled, loading, and error states.

### Do not

- Do not place white text on raw amber or bright orange.
- Do not use the five chart colors as five unrelated semantic statuses.
- Do not make every card a different palette color.
- Do not use pure black backgrounds or pure white borders in dark mode.
- Do not rely on low-opacity text for essential information.
- Do not add another decorative font for headings.
- Do not hide critical constraints or state only in a tooltip.

