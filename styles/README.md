# CSS Organization

All CSS has been organized into separate, modular files for easier maintenance and management. This structure follows best practices for CSS organization and makes it simpler to locate and modify styles.

## CSS Files Structure

### Core Foundation
- **`colors.css`** - All color variables and CSS custom properties (light & dark modes)
- **`typography.css`** - Font definitions and typography settings
- **`tokens.css`** - Design tokens that reference color variables
- **`base.css`** - Base/reset styles applied globally

### Utilities & Effects
- **`animations.css`** - Keyframe animations and animation utility classes
- **`scrollbar.css`** - Custom scrollbar styling for consistent look across browsers
- **`components.css`** - Reusable component styles (glass effects, gradients, shadows, hover effects)

### Feature-Specific Styles
- **`pages-landing.css`** - Styles for the landing page (hero, features, pricing sections)
- **`pages-dashboard.css`** - Styles for the dashboard layout and sidebar
- **`pages-auth.css`** - Styles for authentication pages (login, sign-up, etc.)
- **`widget.css`** - Styles for the chat widget component

## How to Use

### Color Variables
Use the CSS custom properties defined in `colors.css`:
```css
color: var(--primary);
background-color: var(--background);
border-color: var(--border);
```

### Component Styles
Reference classes from `components.css`:
```html
<div class="glass elevation-2 hover-lift">
  Content with glass effect and hover animation
</div>
```

### Tailwind Classes
The project still uses Tailwind CSS. Combine Tailwind classes with the organized CSS files:
```html
<div class="p-4 rounded-lg bg-background text-foreground glass">
  Styled with both Tailwind and custom CSS
</div>
```

## Adding New Styles

1. **New page?** Create a `pages-[name].css` file
2. **New animation?** Add to `animations.css`
3. **New component utility?** Add to `components.css`
4. **New colors?** Add to `colors.css`
5. **Don't forget** to import the new file in `app/globals.css`

## Modifying Styles

### To change colors globally:
Edit `colors.css` and update the CSS custom properties in `:root` and `.dark`

### To update animations:
Edit `animations.css` and modify the keyframes or utility classes

### To style a specific page:
Find the corresponding `pages-[name].css` file and make your changes

### To update component styles:
If it's a reusable component, update `components.css`; if it's page-specific, update the relevant page file

## Benefits of This Structure

✓ **Easy to maintain** - Styles are organized by feature/page
✓ **Simple to find** - Know exactly where a style is defined
✓ **Scalable** - New styles follow the same pattern
✓ **Reusable** - Common utilities in `components.css`
✓ **Consistent** - All color variables defined in one place
✓ **Performance** - CSS is still minified in production

## Import Order

The import order in `app/globals.css` matters:
1. Tailwind core
2. Colors (must be first for variables)
3. Typography
4. Tokens (depends on colors)
5. Base (global resets)
6. Utilities (scrollbar, animations, components)
7. Page-specific styles
8. Widget styles

This ensures variables are available before they're used.
