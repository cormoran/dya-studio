# Development Guide for Coding Agents

## Design System

**Style**: Futuristic Cybernetic + Minimalist

- Clean layouts, generous whitespace
- Glass morphism cards with blur effects
- Glowing accents (electric blue, neon green, cyber purple)
- Functional first, decorative second

**Colors**:

- `--color-electric` (#00d4ff): Primary actions
- `--color-neon` (#00ffcc): Success/connected states
- `--color-cyber` (#8b5cf6): Secondary accent
- Red: Danger only

## Theme System

**Always use CSS variables, never hardcoded colors:**

```css
✅ color: var(--color-text);
❌ color: white;
```

**Variables:**

```
--color-bg                 Page background
--color-surface            Cards/panels
--color-text               Primary text
--color-text-secondary     Secondary text
--color-text-muted         Muted text
--color-border             Borders
--color-border-hover       Hover borders
--color-electric           Primary accent
--color-neon               Success states
--color-cyber              Secondary accent
```

**Usage in Tailwind:**

```tsx
<div className="text-[var(--color-text)]" />
<div className="bg-[var(--color-electric)]/20" />  {/* With opacity */}
```

## CSS Classes

**Components:**

```
glass-card           Glass morphism card
btn-electric         Primary button with glow
btn-neon             Secondary button
btn-ghost            Minimal button
input-field          Styled input
data-card            Key-value display
tab-trigger          Tab button
status-indicator     Status dot (.connected/.disconnected/.error)
```

**Utilities:**

```
text-glow-electric   Blue glow effect
text-glow-neon       Green glow effect
border-glow-electric Glowing border
```

## Page Template

```tsx
import { IconExample } from "@tabler/icons-react";

export function ExamplePage() {
  return (
    <div className="app-page p-4 sm:p-6 h-full">
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

**Layout**: `max-w-4xl` (standard) or `max-w-6xl` (wide), `p-6` padding, `space-y-6` sections, `h-full overflow-auto` for scrolling

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

## Icons

**Library**: @tabler/icons-react (https://tabler.io/icons)

**Sizes**: Tab=18, Page header=24, Status=20, Inline=16

```tsx
import { IconBattery2 } from "@tabler/icons-react";
<IconBattery2 size={24} className="text-[var(--color-electric)]" />;
```

## Accessibility

- Use Radix UI primitives (keyboard navigation built-in)
- Add `aria-label` to icon-only buttons
- Use semantic HTML
- Never rely on color alone (add icons/text)
- App respects `prefers-reduced-motion`

## File Organization

```
src/
├── components/  # UI components
├── pages/       # Feature pages
├── hooks/       # Custom hooks (use*)
├── contexts/    # React contexts (*Context)
└── layouts/     # Page layouts
```

**Naming**: PascalCase for components, camelCase for hooks, kebab-case for CSS

## Component Structure

```tsx
// External imports
import { useState } from "react";
import { IconExample } from "@tabler/icons-react";

// Internal imports
import { useConnection } from "../hooks/useConnection";

// Types
interface Props {
  title: string;
}

// Component
export function Component({ title }: Props) {
  const [value, setValue] = useState(0);
  const connection = useConnection();

  return <div>{/* JSX */}</div>;
}
```

## Contexts

**Connection**: `ConnectionContext` (isConnected, deviceName, onConnect, onDisconnect)
**Theme**: `useTheme()` (theme, toggleTheme, setTheme)

## Common Pitfalls

- ❌ Hardcoded colors → ✅ Use CSS variables
- ❌ Missing `overflow-auto` → ✅ Add to scrollable containers
- ❌ No hover states → ✅ Add hover/focus effects
- ❌ Icon without className → ✅ Set color explicitly
