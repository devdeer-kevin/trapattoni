# TonneRaus – Brand & Design System

> This document defines the complete visual identity for TonneRaus.
> It is the single source of truth for all UI implementation decisions.
> Target quality: on par with Notion, Vercel, Linear.

---

## 1. Typography

### Font Family: Axiforma

Google Outfit is the **exclusive typeface** across the entire product — both web and mobile.
Do **not** substitute with Inter, Roboto, or system fonts.

```css
/* Font weights in use */
font-weight: 400; /* Outfit Regular   — body text, labels, descriptions */
font-weight: 500; /* Outfit Medium    — UI elements, nav, subheadings    */
font-weight: 600; /* Outfit Semi Bold — headings, CTAs, emphasis          */
```

### Type Scale (rem-based, 16px root)

| Role              | Size       | Weight    | Line Height | Letter Spacing |
|-------------------|------------|-----------|-------------|----------------|
| `display`         | 3rem       | Semi Bold | 1.1         | -0.03em        |
| `h1`              | 2rem       | Semi Bold | 1.2         | -0.02em        |
| `h2`              | 1.5rem     | Semi Bold | 1.25        | -0.015em       |
| `h3`              | 1.25rem    | Medium    | 1.3         | -0.01em        |
| `h4`              | 1.0625rem  | Medium    | 1.4         | 0              |
| `body`            | 1rem       | Regular   | 1.6         | 0              |
| `body-sm`         | 0.875rem   | Regular   | 1.5         | 0              |
| `label`           | 0.75rem    | Medium    | 1.4         | 0.02em         |
| `caption`         | 0.6875rem  | Regular   | 1.4         | 0.01em         |
| `mono` (code)     | 0.875rem   | Regular   | 1.6         | 0              |

---

## 2. Color System

### 2.1 CSS Custom Properties — Full Token Set

Implement using CSS variables on `:root` with a `[data-theme="dark"]` / `[data-theme="light"]` override pattern (or use `prefers-color-scheme` media query as fallback).

```css
:root {
  /* ── Brand Palette (raw, theme-agnostic) ─────────────────────── */

  /* Primary */
  --color-rich-black:       #021B1A;   /* RGB  2  27  26 */
  --color-dark-green:       #032221;   /* RGB  3  34  33 */
  --color-bangladesh-green: #03624C;   /* RGB  3  98  76 */
  --color-mountain-meadow:  #2CC295;   /* RGB 44 194 149 */
  --color-caribbean-green:  #00DF81;   /* RGB  0 223 129 */
  --color-anti-flash-white: #F1F7F6;   /* RGB 241 247 246 */

  /* Secondary */
  --color-pine:             #06302B;   /* RGB   6  48  43 */
  --color-basil:            #0B453A;   /* RGB  11  69  58 */
  --color-forest:           #095544;   /* RGB   9  85  68 */
  --color-frog:             #17876D;   /* RGB  23 135 109 */
  --color-mint:             #2FA98C;   /* RGB  47 169 140 */
  --color-stone:            #707D7D;   /* RGB 112 125 125 */
  --color-pistachio:        #AAC8C4;   /* RGB 170 203 196 */
}
```

### 2.2 Semantic Tokens – Dark Mode (default)

```css
[data-theme="dark"],
:root {
  /* Backgrounds */
  --bg-base:          #021B1A;   /* app shell, main canvas           */
  --bg-subtle:        #032221;   /* cards, sidebars, panels          */
  --bg-elevated:      #06302B;   /* modals, dropdowns, popovers      */
  --bg-overlay:       #0B453A;   /* hover states on cards            */

  /* Borders */
  --border-default:   rgba(44, 194, 149, 0.12);
  --border-subtle:    rgba(44, 194, 149, 0.07);
  --border-strong:    rgba(44, 194, 149, 0.25);
  --border-accent:    #03624C;

  /* Text */
  --text-primary:     #F1F7F6;   /* main content                     */
  --text-secondary:   #AAC8C4;   /* supporting, metadata             */
  --text-tertiary:    #707D7D;   /* placeholders, disabled           */
  --text-inverse:     #021B1A;   /* text on bright accent bg         */
  --text-accent:      #00DF81;   /* links, active states             */

  /* Interactive / Accent */
  --accent-primary:   #00DF81;   /* primary CTAs, active nav         */
  --accent-secondary: #2CC295;   /* hover states, secondary actions  */
  --accent-muted:     #03624C;   /* subtle accent fills              */
  --accent-glow:      rgba(0, 223, 129, 0.15); /* glow / shadow accent */

  /* Status */
  --status-success:   #00DF81;
  --status-warning:   #F5A623;
  --status-error:     #FF5C5C;
  --status-info:      #2CC295;

  /* Surface alpha (glassmorphism use cases) */
  --surface-glass:    rgba(3, 34, 33, 0.75);
  --surface-glass-border: rgba(44, 194, 149, 0.15);
}
```

### 2.3 Semantic Tokens – Light Mode

```css
[data-theme="light"] {
  /* Backgrounds */
  --bg-base:          #F1F7F6;   /* main canvas                      */
  --bg-subtle:        #FFFFFF;   /* cards, panels                    */
  --bg-elevated:      #FFFFFF;   /* modals, popovers                 */
  --bg-overlay:       #E4F0EE;   /* hover states                     */

  /* Borders */
  --border-default:   rgba(3, 98, 76, 0.15);
  --border-subtle:    rgba(3, 98, 76, 0.08);
  --border-strong:    rgba(3, 98, 76, 0.3);
  --border-accent:    #2CC295;

  /* Text */
  --text-primary:     #021B1A;   /* main content                     */
  --text-secondary:   #095544;   /* supporting, metadata             */
  --text-tertiary:    #707D7D;   /* placeholders, disabled           */
  --text-inverse:     #F1F7F6;   /* text on dark bg                  */
  --text-accent:      #03624C;   /* links, active states             */

  /* Interactive / Accent */
  --accent-primary:   #03624C;   /* primary CTAs (darker for contrast on light) */
  --accent-secondary: #17876D;   /* hover states                     */
  --accent-muted:     #AAC8C4;   /* subtle fills                     */
  --accent-glow:      rgba(3, 98, 76, 0.12);

  /* Status */
  --status-success:   #03624C;
  --status-warning:   #C67D0C;
  --status-error:     #D93636;
  --status-info:      #17876D;

  /* Surface alpha */
  --surface-glass:    rgba(241, 247, 246, 0.8);
  --surface-glass-border: rgba(3, 98, 76, 0.12);
}
```

---

## 3. Spacing & Layout

### Grid System

```css
/* Base unit: 4px */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;

/* Layout */
--layout-max-width:    1280px;
--layout-content-width: 720px;
--layout-sidebar-width: 260px;
--layout-nav-height:    60px;
```

### Border Radius

```css
--radius-sm:   6px;   /* tags, badges, small inputs  */
--radius-md:   10px;  /* buttons, inputs, small cards */
--radius-lg:   16px;  /* cards, panels               */
--radius-xl:   24px;  /* modals, large surfaces      */
--radius-full: 9999px; /* pills, avatars             */
```

---

## 4. Elevation & Shadows

```css
/* Dark mode shadows use green-tinted glows */
--shadow-sm:   0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle);
--shadow-md:   0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px var(--border-default);
--shadow-lg:   0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px var(--border-default);
--shadow-accent: 0 0 24px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.4);

/* Light mode */
[data-theme="light"] {
  --shadow-sm:   0 1px 4px rgba(2,27,26,0.08);
  --shadow-md:   0 4px 16px rgba(2,27,26,0.1);
  --shadow-lg:   0 8px 32px rgba(2,27,26,0.12);
  --shadow-accent: 0 4px 20px rgba(3,98,76,0.2);
}
```

---

## 5. Component Design Patterns

### Buttons

```
Primary CTA    → bg: --accent-primary,  text: --text-inverse,   radius: --radius-md
Secondary      → bg: --bg-overlay,      text: --text-primary,   border: --border-default
Ghost          → bg: transparent,       text: --text-accent,    border: --border-default
Destructive    → bg: --status-error,    text: white
Disabled       → opacity: 0.4, cursor: not-allowed

Height:  36px (sm) | 44px (default) | 52px (lg)
Padding: 0 --space-4 (sm) | 0 --space-6 (default) | 0 --space-8 (lg)
```

### Inputs & Forms

```
Background:    --bg-elevated
Border:        1px solid --border-default
Border focus:  1px solid --accent-primary + box-shadow: 0 0 0 3px var(--accent-glow)
Border error:  1px solid --status-error
Border radius: --radius-md
Height:        44px (default)
Font:          Axiforma Regular, --body
Label:         Axiforma Medium, --label, --text-secondary
```

### Cards

```
Background:    --bg-subtle
Border:        1px solid --border-subtle
Border radius: --radius-lg
Padding:       --space-6
Hover:         border-color: --border-strong, box-shadow: --shadow-md
Active/focus:  border-color: --accent-primary
```

### Navigation (Top Bar)

```
Background:    --surface-glass (backdrop-filter: blur(12px) saturate(1.5))
Border bottom: 1px solid --border-subtle
Height:        --layout-nav-height (60px)
Logo:          Axiforma Semi Bold, 1.125rem, --text-primary
Active item:   --text-accent, weight 500
Inactive:      --text-secondary, weight 400
```

### Badges & Tags (waste type indicators)

```
Background:    --accent-muted or per-category color
Text:          Axiforma Medium, --label (0.75rem)
Border radius: --radius-sm
Padding:       2px 8px
```

---

## 6. Iconography

- **Style**: Line icons, 1.5px stroke, rounded line caps
- **Sizes**: 16px (inline), 20px (UI), 24px (nav/feature)
- **Library**: Lucide Icons (matches the clean, geometric aesthetic)
- **Color**: Inherit `currentColor` — never hardcode icon fills

---

## 7. Motion & Animation

```css
/* Easing functions */
--ease-out:      cubic-bezier(0.16, 1, 0.3, 1);      /* entrance */
--ease-in:       cubic-bezier(0.7, 0, 0.84, 0);       /* exit     */
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);   /* bouncy   */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);        /* general  */

/* Duration scale */
--duration-instant:  50ms;
--duration-fast:    150ms;   /* hover, toggle states       */
--duration-normal:  250ms;   /* most transitions           */
--duration-slow:    400ms;   /* page-level, modals         */
--duration-crawl:   600ms;   /* hero reveals, onboarding   */
```

**Principles:**
- Hover transitions: `color`, `background`, `border-color`, `box-shadow` — always `--duration-fast`
- Element entrance: fade-up (translateY 8px → 0, opacity 0 → 1), `--duration-slow`, `--ease-out`
- Modals/sheets: scale 0.97 → 1 + fade, `--duration-normal`
- No animation for users with `prefers-reduced-motion: reduce`

---

## 8. Data Visualization (Pickup Schedule)

The waste collection calendar is the core UI. Design principles:

- **Waste type colors** (dark mode):
  - Restmüll (residual): `#707D7D` (Stone)
  - Biomüll (bio): `#17876D` (Frog)
  - Gelbe Tonne (recycling): `#F5A623` (amber – outside base palette, used for yellow bin only)
  - Papier (paper): `#AAC8C4` (Pistachio)
  - Grünschnitt (green waste): `#2CC295` (Mountain Meadow)

- **Upcoming pickup** (next 1–3 days): Show accent border + glow shadow
- **Today marker**: `--accent-primary` dot/pill
- **Past dates**: `--text-tertiary`, reduced opacity

---

## 9. Tailwind CSS Configuration

The pattern: **CSS variables hold the theme values → Tailwind maps utility classes to those variables.**
This means `bg-background`, `text-accent`, `border-border` etc. work as Tailwind classes and respond to theme switching automatically — zero `dark:` prefixes needed in components.

### `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Axiforma', 'sans-serif'],
      },
      colors: {
        // ── Semantic tokens (reference CSS variables) ──────────────
        // Usage: bg-background, text-foreground, border-border, etc.
        background: {
          DEFAULT: 'var(--bg-base)',
          subtle:   'var(--bg-subtle)',
          elevated: 'var(--bg-elevated)',
          overlay:  'var(--bg-overlay)',
        },
        foreground: {
          DEFAULT:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
          inverse:   'var(--text-inverse)',
          accent:    'var(--text-accent)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          subtle:  'var(--border-subtle)',
          strong:  'var(--border-strong)',
          accent:  'var(--border-accent)',
        },
        accent: {
          DEFAULT:   'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          muted:     'var(--accent-muted)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          error:   'var(--status-error)',
          info:    'var(--status-info)',
        },
        // ── Raw brand palette (for one-off use or design tokens) ───
        brand: {
          'rich-black':       '#021B1A',
          'dark-green':       '#032221',
          'bangladesh-green': '#03624C',
          'mountain-meadow':  '#2CC295',
          'caribbean-green':  '#00DF81',
          'anti-flash-white': '#F1F7F6',
          'pine':             '#06302B',
          'basil':            '#0B453A',
          'forest':           '#095544',
          'frog':             '#17876D',
          'mint':             '#2FA98C',
          'stone':            '#707D7D',
          'pistachio':        '#AAC8C4',
        },
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        xl:   '24px',
        '2xl':'32px',
      },
      boxShadow: {
        sm:     'var(--shadow-sm)',
        md:     'var(--shadow-md)',
        lg:     'var(--shadow-lg)',
        accent: 'var(--shadow-accent)',
      },
      transitionTimingFunction: {
        'spring':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-expo':  'cubic-bezier(0.7, 0, 0.84, 0)',
      },
      transitionDuration: {
        fast:   '150ms',
        normal: '250ms',
        slow:   '400ms',
        crawl:  '600ms',
      },
    },
  },
}

export default config
```

### Usage in components

```tsx
// ✅ Correct — semantic classes, theme-aware automatically
<div className="bg-background text-foreground border border-border rounded-lg" />
<button className="bg-accent text-foreground-inverse hover:bg-accent-secondary" />
<p className="text-foreground-secondary text-sm" />

// ✅ Raw brand color when needed
<span className="bg-brand-caribbean-green" />

// ❌ Avoid — hardcoded colors break theming
<div className="bg-[#021B1A] text-[#F1F7F6]" />
```

### `globals.css` — wire up the CSS variables

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* ── Dark Mode (default) ─────────────────────────────────────── */
  :root,
  [data-theme="dark"] {
    --bg-base:          #021B1A;
    --bg-subtle:        #032221;
    --bg-elevated:      #06302B;
    --bg-overlay:       #0B453A;

    --border-default:   rgba(44, 194, 149, 0.12);
    --border-subtle:    rgba(44, 194, 149, 0.07);
    --border-strong:    rgba(44, 194, 149, 0.25);
    --border-accent:    #03624C;

    --text-primary:     #F1F7F6;
    --text-secondary:   #AAC8C4;
    --text-tertiary:    #707D7D;
    --text-inverse:     #021B1A;
    --text-accent:      #00DF81;

    --accent-primary:   #00DF81;
    --accent-secondary: #2CC295;
    --accent-muted:     #03624C;
    --accent-glow:      rgba(0, 223, 129, 0.15);

    --status-success:   #00DF81;
    --status-warning:   #F5A623;
    --status-error:     #FF5C5C;
    --status-info:      #2CC295;

    --shadow-sm:     0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle);
    --shadow-md:     0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px var(--border-default);
    --shadow-lg:     0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px var(--border-default);
    --shadow-accent: 0 0 24px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.4);

    --surface-glass:        rgba(3, 34, 33, 0.75);
    --surface-glass-border: rgba(44, 194, 149, 0.15);
  }

  /* ── Light Mode ──────────────────────────────────────────────── */
  [data-theme="light"] {
    --bg-base:          #F1F7F6;
    --bg-subtle:        #FFFFFF;
    --bg-elevated:      #FFFFFF;
    --bg-overlay:       #E4F0EE;

    --border-default:   rgba(3, 98, 76, 0.15);
    --border-subtle:    rgba(3, 98, 76, 0.08);
    --border-strong:    rgba(3, 98, 76, 0.3);
    --border-accent:    #2CC295;

    --text-primary:     #021B1A;
    --text-secondary:   #095544;
    --text-tertiary:    #707D7D;
    --text-inverse:     #F1F7F6;
    --text-accent:      #03624C;

    --accent-primary:   #03624C;
    --accent-secondary: #17876D;
    --accent-muted:     #AAC8C4;
    --accent-glow:      rgba(3, 98, 76, 0.12);

    --status-success:   #03624C;
    --status-warning:   #C67D0C;
    --status-error:     #D93636;
    --status-info:      #17876D;

    --shadow-sm:     0 1px 4px rgba(2,27,26,0.08);
    --shadow-md:     0 4px 16px rgba(2,27,26,0.1);
    --shadow-lg:     0 8px 32px rgba(2,27,26,0.12);
    --shadow-accent: 0 4px 20px rgba(3,98,76,0.2);

    --surface-glass:        rgba(241, 247, 246, 0.8);
    --surface-glass-border: rgba(3, 98, 76, 0.12);
  }

  /* ── Base styles ─────────────────────────────────────────────── */
  body {
    @apply bg-background text-foreground font-sans;
    font-feature-settings: 'kern' 1, 'liga' 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

---

## 10. Design Philosophy

| Principle          | Implementation                                                                 |
|--------------------|--------------------------------------------------------------------------------|
| **Clarity first**  | Every element must earn its place. No decorative clutter.                     |
| **Dark by default**| The app lives in dark mode. Light mode is a clean inversion, not an afterthought. |
| **Green as signal**| Bright green (`--caribbean-green`) is reserved for interactive elements and success states only. Never use it decoratively. |
| **Generous space** | Prefer whitespace over density. Cards breathe. Sections have room.           |
| **Subtle depth**   | Layering via background tiers (`--bg-base` → `--bg-subtle` → `--bg-elevated`), not shadows. |
| **One accent**     | The entire product uses a single accent color family. No rainbow UIs.         |
| **German precision** | UI copy is concise, functional. No marketing fluff in interface labels.     |

---

## 11. Theme Switching (Next.js)

```typescript
// Recommended: store in localStorage + apply on <html> before hydration
// to avoid flash of wrong theme.

// _app.tsx or root layout:
// <html data-theme={theme} lang="de">

// Prevent FOUC — add to <head> as inline script:
const themeScript = `
  (function() {
    const stored = localStorage.getItem('tonnenraus-theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', stored || preferred);
  })();
`
```

---

*Last updated: March 2026. Font license must be acquired separately (Axiforma via Fontspring or Kayla Fonts).*
