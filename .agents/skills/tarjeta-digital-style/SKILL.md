---
name: tarjeta-digital-style
description: Encodes the exact design system used in Origen's digital business card (tarjeta.html) — color tokens, typography, spacing, and component patterns — so edits to the card stay visually consistent instead of drifting. Use whenever the user asks to change, extend, or add something to tarjeta.html, wants a new digital-card variant, or asks how the card's style compares to the main site (index.html / css/style.css).
---

# Tarjeta Digital — Style Guide

`tarjeta.html` is a single self-contained HTML file (all CSS inline, fonts embedded as base64 `woff2`, no build step) that renders Origen Brows & Hair Studio's shareable digital business card — the page behind the `/t` short link, meant to be opened from a QR code or a link in bio. This skill exists so future edits match what's already there instead of each change inventing its own look.

## Design tokens (as implemented, in `:root`)

```css
--ink: #211b15;        /* primary text, near-black with warm bias */
--bone: #f9f5ee;       /* page background, warm cream */
--card: #ffffff;       /* card surface */
--camel: #b9a37f;      /* accent — borders/hover only, rarely fill */
--camel-deep: #8a7350; /* accent text — labels, links, icon color */
--camel-pale: #efe6d6; /* accent fill — action tile backgrounds */
--line: rgba(33,27,21,0.13);
--shadow: rgba(33,27,21,0.14);
```

Dark mode redefines the same token names (both via `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]`, so an explicit toggle always wins over the OS setting) — never hardcode a color, always reach for the token so both themes stay correct automatically.

## Typography

- **Fraunces** (variable, weights 300–700) for the tagline and service list — the editorial, slightly quirky display face. Uses `font-optical-sizing: auto` and non-integer weights (`font-weight: 440`, `380`) deliberately; that's the variable font being used properly, not a typo.
- **Archivo** (variable, weights 400–700) for everything else — labels, buttons, address, footer.
- Both are embedded directly in the `<style>` block as `src: url(data:font/woff2;base64,...)`. This is intentional: the card is often opened cold from a QR scan on mobile data, so it can't depend on a Google Fonts round-trip. **Do not replace this with a `<link>` to Google Fonts** — keep new type self-hosted the same way, or ask before changing that constraint.

**Known divergence — flag, don't silently fix:** the main site (`index.html` + `css/style.css`) uses a *different* pairing — Playfair Display + Poppins, loaded from `fonts.googleapis.com` — and a close-but-not-identical palette (`--color-primary #1c1916`, `--color-accent #c3b39f`/`#a68f72`, `--color-cream #f6f2ec`). Same brand direction (warm cream + near-black + tan accent, serif display + clean sans body), different exact values and typefaces. If the user asks to "make the card match the site" or vice versa, that's the gap to close — don't assume which side is correct, ask.

## Layout patterns to preserve

- **Hero → seal overlap**: `.hero` is a 4:5 photo with a bottom gradient (`linear-gradient(180deg, transparent 55%, var(--card) 97%)`) fading into the card surface; `.seal` (the logo roundel) sits on top with a negative top margin (`-82px`) so it visually "sits" on the fading photo edge. If the hero photo changes, keep the gradient — without it the seal reads as pasted-on.
- **Pill CTA**: one primary action (`cta-primary`, full-width, `border-radius: 999px`, ink-filled) — never add a second same-weight CTA; secondary actions belong in the icon grid below.
- **Action grid**: `grid-template-columns: repeat(3, 1fr)`, icon + label, `camel-pale` fill. Currently 6 items (2 rows of 3) — sitio, Instagram, WhatsApp, llamar, email, guardar contacto (a `data:text/vcard` download, generated inline — update it whenever contact info changes, it's easy to forget since it's a long encoded URL, not a separate file).
- Body copy is center-aligned throughout (`.body { text-align: center }`) — this is a deliberate editorial-card look, not a default; don't left-align new sections without a reason.

## Motion & accessibility already handled — keep it that way

- `.card` has a one-time entrance animation (`rise`, 700ms), disabled under `@media (prefers-reduced-motion: reduce)`.
- `:focus-visible` outlines are defined on interactive elements (`cta-primary`, `.action`) using `--camel-deep` — don't remove them for a "cleaner" look.
- All icons are inline SVG with `aria-hidden="true"` and a visible text label next to them — keep that pairing for any new action tile (icon-only buttons with no label fail accessibility here).

## When reviewing/auditing the card

Check, in order: token usage (no hardcoded hex outside `:root`), font embedding intact, single primary CTA, `alt` text present on both images, dark-mode contrast (the hero photo itself doesn't adapt to dark mode — only the `.seal` background and surrounding gradient do, which is intentional so the logo mark stays legible on white in both themes), and whether the change was also needed on `index.html` for brand consistency (see divergence note above).
