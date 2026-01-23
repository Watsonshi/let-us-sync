# Design Tokens Reference

Common design token patterns for consistent UI.

## Color System

### Primary Colors
```css
--primary: 214 88% 27%;          /* Main brand color */
--primary-foreground: 0 0% 100%;  /* Text on primary */
--primary-light: 214 88% 40%;
--primary-dark: 214 88% 20%;
```

### Semantic Colors
```css
--success: 142 71% 45%;   /* Green - success states */
--warning: 38 92% 50%;    /* Orange - warnings */
--error: 0 84% 60%;       /* Red - errors */
--info: 199 89% 48%;      /* Blue - informational */
```

### Neutral Palette
```css
--background: 0 0% 100%;
--foreground: 222 47% 11%;
--muted: 210 40% 96%;
--muted-foreground: 215 16% 47%;
--border: 214 32% 91%;
```

## Typography Scale

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### Font Weights
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

## Spacing Scale

```css
--spacing-0: 0;
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-10: 2.5rem;  /* 40px */
--spacing-12: 3rem;    /* 48px */
--spacing-16: 4rem;    /* 64px */
```

## Border Radius

```css
--radius-none: 0;
--radius-sm: 0.125rem;   /* 2px */
--radius-md: 0.375rem;   /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-full: 9999px;   /* Fully rounded */
```

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```

## Breakpoints

```css
/* Mobile-first approach */
--screen-sm: 640px;   /* Tablet */
--screen-md: 768px;   /* Small laptop */
--screen-lg: 1024px;  /* Desktop */
--screen-xl: 1280px;  /* Large desktop */
--screen-2xl: 1536px; /* Extra large */
```

## Animation Timings

```css
--duration-75: 75ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
--duration-700: 700ms;
--duration-1000: 1000ms;
```

### Easing Functions
```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

## Z-Index Scale

```css
--z-0: 0;
--z-10: 10;      /* Dropdowns */
--z-20: 20;      /* Sticky headers */
--z-30: 30;      /* Modals backdrop */
--z-40: 40;      /* Modal content */
--z-50: 50;      /* Tooltips */
--z-max: 9999;   /* Notifications */
```

## Usage in Tailwind

```tsx
// Good: Using design tokens
<div className="text-primary bg-background p-4 rounded-lg shadow-md">

// Bad: Magic numbers
<div className="text-[#1F5A96] bg-white p-[16px] rounded-[8px]">
```

## Usage in CSS

```css
.card {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```
