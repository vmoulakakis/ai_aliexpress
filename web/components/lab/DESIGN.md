---
version: 1
scope: FOUND. LAB /lab
token_source: lab.module.css
---
# FOUND. LAB design context

## Overview
An equipment workbench inside FOUND., serving Greek AI developers and small R&D teams. The single job is to turn one of three research use cases into a sourced, editable equipment plan. The current user approved an MVP combining robotics and AI compute. It is not a separate app identity or a new production site.

## Colors
Existing root DESIGN.md owns the identity. Runtime owner is `lab.module.css` `.lab`: paper #f1f0e8, surface #fafaf5, ink #131a1a, forest #172320, lime #c9ed78, muted #58635e, line #d2d5cb. Amber #925218 and error #a62b28 communicate warnings with text, never color alone. Scrollbars share a visible tokenized baseline on this route; forced colors use system colors.

## Typography
Georgia, Times New Roman, serif for display; system-ui, Segoe UI, Arial for Greek body and controls; ui-monospace for technical labels. Large Greek serif headlines preserve FOUND.'s editorial identity. No network fonts or resulting font swaps. Main locale el-GR, date timezone Europe/Athens.

## Layout
Hybrid register: explanatory hero, then an application workspace. Maximum 1512px, 5% side gutters, natural document scrolling. Signature is a custom schematic lab bench with camera, robot and compute, explicitly labeled as an illustration. Quiet editorial mission rows avoid a product-card wall. Two columns become one at 800px; editable line prices move below item copy at 440px. Tables alone may scroll horizontally. The desktop cost summary is sticky without restricting the form's document scrolling.

## Elevation & Depth
Hairline borders and tonal surfaces carry hierarchy. A restrained shadow is reserved for the feedback toast. The workbench drawing uses diagrammatic shading, not fabricated product photography.

## Shapes
6px panel and button radius, 4px fields, circular arrow and count affordances. No decorative animated glow or fake progress.

## Components
`EquipmentLab.tsx` owns this bounded workflow; catalog and planner modules own data and calculations. Radio groups are native fieldsets with custom labels, preserving native keyboard operation. There are no single-select popups or modal dialogs. Native number inputs own numeric entry; native details own disclosure. Button emphasis is shared via CSS classes; dark primary, outline secondary and text tertiary. Busy states are not simulated for synchronous calculations.

## Motion
Hover color feedback 180ms. Scroll navigation can be smooth; reduced-motion preference disables it. No ongoing decorative motion.

## Content
The keyword matcher and curated plans are expressly not an LLM. All amounts are editable planning assumptions, not purchase prices, verified landed costs or quotes. Product facts link to primary sources; compatibility, availability and performance remain unverified. No fake ratings, scarcity or affiliate claims. Sources reviewed 2026-11-23. A product-development kit is not presented as a certified production installation.

## Do's and Don'ts
- Preserve the parent site's existing routes and identity.
- Keep uncertainty and costs beside the decision they affect.
- Do not imply the illustrated equipment is a branded product.
- Do not imply a document review is a physical hardware test.
