# DYA Studio Development Guide

This guide helps developers implement feature pages and components consistently within the DYA Studio application.

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Technology Stack](#technology-stack)
3. [Theme System](#theme-system)
4. [Common CSS Classes](#common-css-classes)
5. [Page Structure Template](#page-structure-template)
6. [Component Patterns](#component-patterns)
7. [Icon Usage](#icon-usage)
8. [Accessibility Guidelines](#accessibility-guidelines)
9. [File Organization](#file-organization)
10. [Code Style](#code-style)
11. [Testing](#testing)

---

## Design Philosophy

### Core Principles

DYA Studio follows a **"Futuristic Cybernetic + High-Branding Simple"** design approach:

1. **Minimalist Foundation**: Clean layouts with generous whitespace. Avoid visual clutter.

2. **Cybernetic Accents**: Use glowing effects, electric blue highlights, and subtle animations sparingly to create a futuristic feel without overwhelming the user.

3. **Glass Morphism**: Semi-transparent cards with blur effects create depth and modern aesthetics.

4. **High-Branding**: The DYA logo and brand identity should be prominent but not intrusive. Consistency in typography and spacing reinforces brand recognition.

5. **Functional First**: Every visual element should serve a purpose. Decorative elements are secondary to usability.

### Color Psychology

- **Electric Blue (`--color-electric`)**: Primary action color. Draws attention to interactive elements.
- **Neon Green (`--color-neon`)**: Success states, positive indicators (e.g., "connected", "OK").
- **Cyber Purple (`--color-cyber`)**: Secondary accent for variety (e.g., BLE, Trackball sections).
- **Red**: Danger/destructive actions only.

### Visual Hierarchy

1. Page headers with icon + title
2. Primary content cards (glass-card)
3. Secondary information (muted text)
4. Action buttons at natural decision points

---

## Technology Stack

| Category      | Technology                       |
| ------------- | -------------------------------- |
| Framework     | React 19 + TypeScript            |
| Build Tool    | Vite (rolldown-vite)             |
| Styling       | Tailwind CSS v4                  |
| UI Components | Radix UI (accessible primitives) |
| Animations    | Framer Motion                    |
| Icons         | @tabler/icons-react              |

---

## Theme System

### CSS Variables

The app supports **dark** and **light** modes via CSS variables. Always use CSS variables instead of hardcoded colors:

```css
/* ✅ Correct */
color: var(--color-text);
background: var(--color-surface);
border-color: var(--color-border);

/* ❌ Incorrect */
color: white;
background: #141414;
border-color: rgba(255, 255, 255, 0.1);
```

### Available Variables

| Variable                   | Dark Mode               | Light Mode           | Usage                  |
| -------------------------- | ----------------------- | -------------------- | ---------------------- |
| `--color-bg`               | `#0a0a0a`               | `#f8fafc`            | Page background        |
| `--color-surface`          | `#141414`               | `#ffffff`            | Card/panel backgrounds |
| `--color-surface-elevated` | `#1a1a1a`               | `#f1f5f9`            | Elevated surfaces      |
| `--color-text`             | `#ffffff`               | `#0f172a`            | Primary text           |
| `--color-text-secondary`   | `rgba(255,255,255,0.7)` | `rgba(15,23,42,0.7)` | Secondary text         |
| `--color-text-muted`       | `rgba(255,255,255,0.5)` | `rgba(15,23,42,0.5)` | Muted/hint text        |
| `--color-border`           | `rgba(255,255,255,0.1)` | `rgba(15,23,42,0.1)` | Borders                |
| `--color-border-hover`     | `rgba(255,255,255,0.2)` | `rgba(15,23,42,0.2)` | Hover borders          |
| `--color-electric`         | `#00d4ff`               | `#0099cc`            | Primary accent         |
| `--color-neon`             | `#00ffcc`               | `#00b894`            | Success/positive       |
| `--color-cyber`            | `#8b5cf6`               | `#8b5cf6`            | Secondary accent       |

### Using Variables in Tailwind Classes

```tsx
// Use arbitrary values with CSS variables
<div className="text-[var(--color-text)]" />
<div className="bg-[var(--color-surface)]" />
<div className="border-[var(--color-border)]" />

// For opacity modifiers
<div className="bg-[var(--color-electric)]/20" />
<div className="border-[var(--color-neon)]/30" />
```

---

## Common CSS Classes

### Pre-defined Component Classes

| Class              | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `glass-card`       | Glass morphism card with blur, border, and shadow                 |
| `glass-panel`      | Gradient glass panel for larger sections                          |
| `btn-electric`     | Primary action button with electric glow                          |
| `btn-neon`         | Secondary action button with neon glow                            |
| `btn-ghost`        | Minimal text button                                               |
| `input-field`      | Styled text input                                                 |
| `data-card`        | Card for displaying key-value data                                |
| `data-card-label`  | Label text in data card                                           |
| `data-card-value`  | Value text in data card                                           |
| `tab-trigger`      | Tab button styling                                                |
| `status-indicator` | Small status dot (add `.connected`, `.disconnected`, or `.error`) |
| `theme-toggle`     | Theme switch button styling                                       |

### Utility Classes

| Class                  | Description                            |
| ---------------------- | -------------------------------------- |
| `text-glow-electric`   | Electric blue text glow                |
| `text-glow-neon`       | Neon green text glow                   |
| `bg-gradient-dark`     | Background gradient from bg to surface |
| `bg-gradient-cyber`    | Subtle purple-to-blue gradient overlay |
| `border-glow-electric` | Glowing electric border                |

---

## Page Structure Template

Every feature page should follow this structure:

```tsx
import { IconExample } from "@tabler/icons-react";

export function ExamplePage() {
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
            <IconExample size={24} className="text-[var(--color-electric)]" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-[var(--color-text)]">
              Page Title
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Brief description of the page purpose
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">{/* Content sections go here */}</div>

        {/* Info/Help Box (optional) */}
        <div className="mt-8 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
          <p className="text-xs text-[var(--color-text-muted)]">
            Helpful information or instructions for the user.
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Layout Guidelines

- **Container**: Use `max-w-4xl mx-auto` for standard pages, `max-w-6xl` for wide content (e.g., Keymap)
- **Padding**: `p-6` on the outer container
- **Section Spacing**: `space-y-6` between major sections, `mb-8` after header
- **Scrolling**: Parent div should have `h-full overflow-auto`

---

## Component Patterns

### Data Display Card

```tsx
<div className="glass-card data-card">
  <span className="data-card-label">Label Text</span>
  <span className="data-card-value text-[var(--color-neon)]">Value</span>
</div>
```

### Settings Row

```tsx
<div className="flex items-center justify-between">
  <div>
    <p className="text-sm text-[var(--color-text-secondary)]">Setting Name</p>
    <p className="text-xs text-[var(--color-text-muted)]">
      Description of what this setting does
    </p>
  </div>
  {/* Control element (select, input, toggle, etc.) */}
</div>
```

### Section Card with Header

```tsx
<div className="glass-card p-6">
  <h3 className="text-sm font-medium text-[var(--color-text)] mb-4">
    Section Title
  </h3>
  <div className="space-y-4">{/* Section content */}</div>
</div>
```

### Toggle Switch (Placeholder)

```tsx
<div className="w-10 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] relative cursor-pointer">
  <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-[var(--color-text-muted)]" />
</div>;

{
  /* When active */
}
<div className="w-10 h-6 rounded-full bg-[var(--color-electric)] relative cursor-pointer">
  <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
</div>;
```

### Slider (Placeholder)

```tsx
<div className="relative">
  <div className="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
    <div className="h-full w-1/2 bg-gradient-to-r from-[var(--color-electric)]/50 to-[var(--color-electric)] rounded-full" />
  </div>
  <div className="flex justify-between mt-2 text-xs text-[var(--color-text-muted)]">
    <span>Min</span>
    <span>Max</span>
  </div>
</div>
```

### List Item with Actions

```tsx
<div className="glass-card p-4 flex items-center justify-between">
  <div className="flex items-center gap-4">
    {/* Icon or indicator */}
    <div className="w-10 h-10 rounded-full bg-[var(--color-border)] flex items-center justify-center">
      <span className="text-sm font-mono text-[var(--color-text-muted)]">
        1
      </span>
    </div>
    {/* Content */}
    <div>
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
        Item Title
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">Subtitle</p>
    </div>
  </div>
  {/* Actions */}
  <div className="flex items-center gap-2">
    <button className="btn-ghost text-sm">Action</button>
  </div>
</div>
```

### Status Grid Item

```tsx
<div className="glass-card p-4 flex items-center gap-4">
  <IconCircleCheck size={20} className="text-[var(--color-neon)]" />
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-[var(--color-text)]">
      Component Name
    </p>
    <p className="text-xs text-[var(--color-text-muted)] truncate">
      Description
    </p>
  </div>
  <span className="text-xs font-mono uppercase text-[var(--color-neon)]">
    OK
  </span>
</div>
```

---

## Icon Usage

### Icon Library

Use **@tabler/icons-react** for all icons. Browse available icons at: https://tabler.io/icons

### Import Pattern

```tsx
import {
  IconBattery2,
  IconBluetooth,
  IconSettings,
  // ... etc
} from "@tabler/icons-react";
```

### Standard Sizes

| Context          | Size | Example                         |
| ---------------- | ---- | ------------------------------- |
| Tab navigation   | 18   | `<IconBattery2 size={18} />`    |
| Page header      | 24   | `<IconSettings size={24} />`    |
| Status indicator | 20   | `<IconCircleCheck size={20} />` |
| Inline with text | 16   | `<IconLink size={16} />`        |

### Icon Colors

Always use CSS variables for icon colors:

```tsx
<IconBattery2 className="text-[var(--color-electric)]" />
<IconCircleCheck className="text-[var(--color-neon)]" />
<IconAlertCircle className="text-red-500" />
```

---

## Accessibility Guidelines

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Use Radix UI primitives which handle focus management automatically
- Visible focus states are provided by default button/input styles

### Screen Readers

- Always provide `aria-label` for icon-only buttons:

  ```tsx
  <button aria-label="Switch to dark mode" className="theme-toggle">
    <IconMoon size={18} />
  </button>
  ```

- Use semantic HTML elements (`<main>`, `<header>`, `<nav>`, `<section>`)

### Color Contrast

- Text on dark backgrounds: Use `--color-text` (white) or `--color-text-secondary`
- Text on light backgrounds: Use `--color-text` (dark) or `--color-text-secondary`
- Never rely on color alone to convey information (add icons or text labels)

### Reduced Motion

The app respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are disabled automatically */
}
```

---

## File Organization

```
src/
├── assets/              # Static assets (SVGs, images)
│   └── dya.svg
├── components/          # Reusable UI components
│   ├── DeviceConnection.tsx
│   ├── PageTransition.tsx
│   ├── SplashScreen.tsx
│   └── TabNavigation.tsx
├── contexts/            # React contexts
│   └── ThemeContext.tsx
├── hooks/               # Custom hooks
│   ├── useConnection.ts
│   └── useTheme.ts
├── layouts/             # Page layouts
│   └── AppLayout.tsx
├── pages/               # Feature pages
│   ├── BatteryPage.tsx
│   ├── BLEConnectionsPage.tsx
│   ├── HealthCheckPage.tsx
│   ├── KeymapPage.tsx
│   ├── SettingsPage.tsx
│   └── TrackballPage.tsx
├── App.tsx              # Main app component
├── index.css            # Global styles + Tailwind
├── main.tsx             # Entry point
└── vite-env.d.ts        # Type declarations
```

### Naming Conventions

| Type        | Convention                       | Example                      |
| ----------- | -------------------------------- | ---------------------------- |
| Components  | PascalCase                       | `BatteryPage.tsx`            |
| Hooks       | camelCase with `use` prefix      | `useTheme.ts`                |
| Contexts    | PascalCase with `Context` suffix | `ThemeContext.tsx`           |
| CSS classes | kebab-case                       | `glass-card`, `btn-electric` |

---

## Code Style

### TypeScript

- Enable strict mode
- Define explicit types for props:
  ```tsx
  interface PageProps {
    deviceName?: string;
    onSave: (data: Settings) => void;
  }
  ```

### Component Structure

```tsx
// 1. Imports (external)
import { useState } from "react";
import { IconExample } from "@tabler/icons-react";

// 2. Imports (internal)
import { useConnection } from "../hooks/useConnection";

// 3. Types/Interfaces
interface ExampleProps {
  title: string;
}

// 4. Constants (if any)
const DEFAULT_VALUE = 100;

// 5. Component
export function ExampleComponent({ title }: ExampleProps) {
  // State
  const [value, setValue] = useState(DEFAULT_VALUE);

  // Hooks
  const connection = useConnection();

  // Derived values
  const isValid = value > 0;

  // Handlers
  const handleChange = (newValue: number) => {
    setValue(newValue);
  };

  // Render
  return <div>{/* JSX */}</div>;
}
```

### JSX Guidelines

- Use self-closing tags for elements without children
- Keep JSX readable with proper indentation
- Extract complex conditionals into variables
- Add comments for non-obvious sections:
  ```tsx
  {/* Thumb Cluster */}
  <div className="flex gap-1.5 mt-2">
  ```

---

## Device Connection Context

### Accessing Connection State

```tsx
import { useContext } from "react";
import { ConnectionContext } from "../components/DeviceConnection";

function MyComponent() {
  const connection = useContext(ConnectionContext);

  // Available properties:
  // - connection.isConnected: boolean
  // - connection.deviceName: string | undefined
  // - connection.isLoading: boolean
  // - connection.error: string | null
  // - connection.onConnect: () => void
  // - connection.onDisconnect: () => void
}
```

### Conditional Rendering Based on Connection

```tsx
{
  connection.isConnected ? (
    <div>Connected content</div>
  ) : (
    <div className="text-[var(--color-text-muted)]">
      Connect your keyboard to access this feature
    </div>
  );
}
```

---

## Theme Context

### Accessing Theme State

```tsx
import { useTheme } from "../hooks/useTheme";

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();

  // theme: "dark" | "light"
  // toggleTheme: () => void
  // setTheme: (theme: "dark" | "light") => void
}
```

---

## Responsive Design

### Breakpoints

| Name     | Width  | Usage                                         |
| -------- | ------ | --------------------------------------------- |
| `tablet` | 768px+ | Primary breakpoint for tablet/desktop layouts |

### Responsive Patterns

```tsx
// Hide on mobile, show on tablet+
<span className="hidden tablet:inline">Full Label</span>

// Single column mobile, multi-column tablet
<div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">

// Adjust sizing
<div className="w-full tablet:w-auto">
```

---

## Common Pitfalls to Avoid

1. **Hardcoded Colors**: Always use CSS variables for theme compatibility

2. **Missing Theme Transitions**: Add `transition-colors duration-300` for smooth theme switching

3. **Forgetting Overflow**: Content containers need `overflow-auto` to enable scrolling

4. **Icon Color Inheritance**: Icon components don't inherit `color` by default; set `className` explicitly

5. **z-index Conflicts**: Use Tailwind's z-index scale (`z-10`, `z-20`, etc.) consistently

6. **Missing Hover States**: Interactive elements should have clear hover/focus states

---

## Example: Implementing a New Page

Let's say you need to implement a "Macros" page:

1. **Create the file**: `src/pages/MacrosPage.tsx`

2. **Follow the template**:

   ```tsx
   import { IconCommand } from "@tabler/icons-react";

   export function MacrosPage() {
     return (
       <div className="p-6 h-full overflow-auto">
         <div className="max-w-4xl mx-auto">
           {/* Header */}
           <div className="flex items-center gap-3 mb-8">
             <div className="p-2 rounded-lg bg-[var(--color-cyber)]/10 border border-[var(--color-cyber)]/20">
               <IconCommand size={24} className="text-[var(--color-cyber)]" />
             </div>
             <div>
               <h1 className="text-xl font-medium text-[var(--color-text)]">
                 Macros
               </h1>
               <p className="text-sm text-[var(--color-text-muted)]">
                 Create and manage keyboard macros
               </p>
             </div>
           </div>

           {/* Content */}
           <div className="space-y-6">{/* Add your sections here */}</div>
         </div>
       </div>
     );
   }
   ```

3. **Register in App.tsx**:

   ```tsx
   import { MacrosPage } from "./pages/MacrosPage";

   const tabs: TabItem[] = [
     // ... existing tabs
     {
       id: "macros",
       label: "Macros",
       icon: <IconCommand size={18} />,
       content: <MacrosPage />,
     },
   ];
   ```

---

## Questions?

If you encounter design decisions not covered by this guide, prefer:

1. Consistency with existing pages
2. Simplicity over complexity
3. User experience over visual flair

When in doubt, reference the existing `BatteryPage.tsx` or `SettingsPage.tsx` as canonical examples.

---

## Testing

All features and components should have corresponding tests to ensure reliability and prevent regressions.

### Writing Tests

DYA Studio uses **Jest** and **React Testing Library** for testing. Tests should:

1. **Focus on user behavior** rather than implementation details
2. **Use semantic queries** that reflect how users interact with the app
3. **Test integration** rather than isolated units when possible
4. **Cover error states** and edge cases

### Example Test Structure

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "../MyComponent";

describe("MyComponent", () => {
  beforeEach(() => {
    // Setup mocks and reset state
  });

  test("handles user interaction", async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    const button = screen.getByRole("button", { name: /click me/i });
    await user.click(button);
    
    expect(screen.getByText("Success!")).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Before Submitting

Always run tests before submitting your changes:

```bash
npm run lint    # Check for code style issues
npm test        # Ensure all tests pass
```

For comprehensive testing guidelines, examples, and best practices, see the **[Testing Guide](TESTING_GUIDE.md)**.
