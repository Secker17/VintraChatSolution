# CSS Architecture

This project uses a modular CSS architecture that separates styles into organized, maintainable files instead of relying on inline Tailwind utility classes. Each file has a specific purpose and follows clear naming conventions.

## File Organization

### Foundation Files (Core Design System)
- **`colors.css`** - Color variables and CSS custom properties (light & dark modes)
- **`typography.css`** - Font definitions and typography settings
- **`tokens.css`** - Design tokens and reusable values
- **`base.css`** - Base/reset styles applied globally

### UI & Component Files (Reusable Utilities)
- **`animations.css`** - Keyframe animations and animation utility classes
- **`scrollbar.css`** - Custom scrollbar styling
- **`components.css`** - Reusable component styles (glass effects, shadows, hover effects)
- **`utilities.css`** - Common utility classes (flexbox, grid, spacing, sizing, typography)

### Layout Files
- **`layout-root.css`** - Root layout and global structure

### Page-Specific Files (Feature Styles)
- **`page-landing.css`** - Landing page (hero, features, pricing, CTA, footer)
- **`page-dashboard.css`** - Dashboard layout, sidebar, and all dashboard pages
- **`page-auth.css`** - Authentication pages (login, signup, error)
- **`page-widget.css`** - Chat widget and widget preview styles

## Class Naming Conventions

### Page-Specific Classes
Each page file uses a prefix based on its feature:

```css
/* Landing Page */
.landing-hero { }
.landing-hero-title { }
.landing-hero-description { }
.landing-nav-link { }
.landing-nav-link-active { }

/* Dashboard */
.dashboard-sidebar { }
.dashboard-sidebar-wrapper { }
.dashboard-nav-link { }
.dashboard-nav-link-inactive { }

/* Auth Pages */
.login-form { }
.signup-container { }
.error-page { }

/* Widget */
.widget-chat-messages { }
.widget-message-bubble { }
.widget-input-container { }
```

### Utility Classes
Common utilities use simple, semantic names (in `utilities.css`):

```css
.flex-center { }              /* flex items-center justify-center */
.flex-between { }             /* flex items-center justify-between */
.flex-col-center { }          /* flex flex-col items-center justify-center */
.grid-responsive { }          /* grid with responsive columns */
.text-truncate { }            /* truncate single line */
.text-truncate-2 { }          /* truncate to 2 lines */
.rounded-sm { }               /* rounded corners */
.shadow-lg { }                /* large shadow */
.hidden-mobile { }            /* hidden on mobile, visible on desktop */
.hover-lift { }               /* scale up on hover */
```

## Migration Guide: From Inline Tailwind to CSS Classes

### Step 1: Identify the Component
Find the component with inline Tailwind classes.

### Step 2: Extract Tailwind Classes
Identify all the `className` strings in the component.

### Step 3: Create/Update CSS File
Add classes to the appropriate CSS file (page-specific or utilities).

### Step 4: Replace Classes
Replace long className strings with semantic class names.

### Step 5: Test All Variants
Test in light/dark mode and all screen sizes.

---

## Example 1: Dashboard Button

### ❌ Before (Inline Tailwind)
```tsx
// components/dashboard/sidebar.tsx
<Link
  href={item.href}
  className={cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  )}
>
  <item.icon className="h-4 w-4" />
  {item.name}
</Link>
```

### ✅ After (CSS Classes)
```tsx
// components/dashboard/sidebar.tsx
<Link
  href={item.href}
  className={cn(
    isActive ? 'dashboard-nav-link-active' : 'dashboard-nav-link-inactive',
    'dashboard-nav-link'
  )}
>
  <item.icon className="dashboard-nav-icon" />
  {item.name}
</Link>
```

```css
/* styles/page-dashboard.css */
.dashboard-nav-link {
  @apply flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors;
}

.dashboard-nav-link-active {
  @apply bg-primary text-primary-foreground;
}

.dashboard-nav-link-inactive {
  @apply text-muted-foreground hover:bg-muted hover:text-foreground;
}

.dashboard-nav-icon {
  @apply h-4 w-4;
}
```

---

## Example 2: Landing Page Hero Section

### ❌ Before (Inline Tailwind)
```tsx
// app/page.tsx
<section className="container mx-auto px-4 py-20 md:py-32">
  <div className="mx-auto max-w-3xl text-center">
    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-balance">
      Live chat for your website in <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">seconds</span>
    </h1>
    <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
      Add a beautiful chat widget...
    </p>
    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href="/auth/sign-up">
          Start Free <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  </div>
</section>
```

### ✅ After (CSS Classes)
```tsx
// app/page.tsx
<section className="landing-hero">
  <div className="landing-hero-content">
    <h1 className="landing-hero-title">
      Live chat for your website in 
      <span className="landing-hero-title-gradient">seconds</span>
    </h1>
    <p className="landing-hero-description">
      Add a beautiful chat widget...
    </p>
    <div className="landing-hero-cta">
      <Button asChild size="lg" className="landing-hero-cta-button">
        <Link href="/auth/sign-up">
          Start Free <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  </div>
</section>
```

```css
/* styles/page-landing.css */
.landing-hero {
  @apply container mx-auto px-4 py-20 md:py-32;
}

.landing-hero-content {
  @apply mx-auto max-w-3xl text-center;
}

.landing-hero-title {
  @apply text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-balance;
}

.landing-hero-title-gradient {
  @apply bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent;
}

.landing-hero-description {
  @apply mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty;
}

.landing-hero-cta {
  @apply mt-10 flex flex-col sm:flex-row items-center justify-center gap-4;
}

.landing-hero-cta-button {
  @apply w-full sm:w-auto;
}
```

---

## Example 3: Card Component

### ❌ Before (Inline Tailwind)
```tsx
// components/ui/card.tsx
<Card className="relative border-2 hover:border-foreground/20 transition-colors">
  <CardHeader>
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
      <feature.icon className="h-6 w-6" />
    </div>
    <CardTitle className="mt-4">{feature.title}</CardTitle>
  </CardHeader>
  <CardContent>
    <CardDescription className="text-base">
      {feature.description}
    </CardDescription>
  </CardContent>
</Card>
```

### ✅ After (CSS Classes)
```tsx
// components/ui/card.tsx
<Card className="landing-feature-card">
  <CardHeader>
    <div className="landing-feature-icon">
      <feature.icon className="landing-feature-icon-svg" />
    </div>
    <CardTitle>{feature.title}</CardTitle>
  </CardHeader>
  <CardContent>
    <CardDescription className="landing-feature-description">
      {feature.description}
    </CardDescription>
  </CardContent>
</Card>
```

```css
/* styles/page-landing.css */
.landing-feature-card {
  @apply relative border-2 hover:border-foreground/20 transition-colors;
}

.landing-feature-icon {
  @apply flex h-12 w-12 items-center justify-center rounded-lg bg-muted;
}

.landing-feature-icon-svg {
  @apply h-6 w-6;
}

.landing-feature-description {
  @apply text-base;
}
```

---

## Example 4: Using Utility Classes

For common patterns that appear in multiple components, use utility classes from `utilities.css`:

### ❌ Before
```tsx
<div className="flex items-center justify-center gap-4">
  <Icon className="h-4 w-4" />
  <span>Text</span>
</div>

<div className="flex items-center justify-between px-4 py-2">
  Left content
  <button>Right</button>
</div>
```

### ✅ After
```tsx
<div className="flex-center flex-gap">
  <Icon className="size-sm" />
  <span>Text</span>
</div>

<div className="flex-between space-padding">
  Left content
  <button>Right</button>
</div>
```

```css
/* Already in utilities.css */
.flex-center { @apply flex items-center justify-center; }
.flex-between { @apply flex items-center justify-between; }
.flex-gap { @apply gap-4; }
.space-padding { @apply px-4 py-2; }
.size-sm { @apply h-4 w-4; }
```

---

## Quick Reference: Common Replacements

| Inline Tailwind | CSS Class | Location |
|---|---|---|
| `size="lg"` on Button | See `dashboard-nav-icon`, `size-lg` | `utilities.css` |
| `className="flex items-center gap-4"` | `flex-center flex-gap` | `utilities.css` |
| `className="text-sm text-muted-foreground"` | Create specific class | page-specific file |
| `className="p-4 rounded-lg bg-card"` | Create component class | `components.css` |
| `className="text-xl font-bold"` | Create heading class | `typography.css` or page file |
| `className="h-4 w-4"` | `size-sm` | `utilities.css` |
| `hover:opacity-80` | `hover-fade` | `utilities.css` |
| `transition-all duration-300` | `transition-base` | `utilities.css` |

---

## Best Practices

✅ **DO:**
- Keep semantic, descriptive class names
- Group related styles together
- Use CSS files for reusable patterns
- Combine utility classes for one-off styles
- Test in light/dark mode and all breakpoints

❌ **DON'T:**
- Mix inline Tailwind with CSS classes randomly
- Create overly specific class names
- Leave styles scattered in components
- Forget to import new CSS files in `globals.css`
- Add `!important` flags unnecessarily

---

## How to Add New Styles

### For a New Page Feature:
1. Add classes to the appropriate `page-[name].css` file
2. Use clear naming: `.page-section-element`

### For Reusable Utilities:
1. Add to `utilities.css`
2. Use simple names: `.flex-center`, `.text-truncate`

### For New Components:
1. Add to `components.css` or create `components-[type].css`
2. Document the purpose in a comment

### Don't Forget:
1. Import the new file in `app/globals.css`
2. Test in all themes and breakpoints
3. Update this README if adding major new patterns

---

## Benefits of This Approach

✅ **Easier to Change** - All styles in CSS files, not scattered across components
✅ **Better Organization** - Related styles grouped logically
✅ **Improved Reusability** - Common patterns defined once
✅ **Simpler Maintenance** - Clear naming makes updates straightforward
✅ **Consistent Design** - Standardized class names across project
✅ **Reduced Component Clutter** - Components focus on logic, not styling
✅ **Theme Support** - Easy to swap themes via CSS variables

---

## Import Order (In app/globals.css)

Order matters for CSS cascade:
1. Tailwind core
2. Colors (variables must load first)
3. Typography
4. Tokens
5. Base
6. Animations, scrollbar, components, utilities
7. Layout files
8. Page-specific files

This ensures variables are available before they're used.

