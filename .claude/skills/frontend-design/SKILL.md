---
name: frontend-design
description: Comprehensive frontend design analysis including UI/UX review, accessibility audit, responsive design check, component architecture, and design system consistency
user-invocable: true
disable-model-invocation: false
argument-hint: "[component-path or 'full']"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
---

# Frontend Design Expert

A comprehensive skill for analyzing and improving frontend design, user experience, and visual consistency.

## Capabilities

### 1. UI/UX Analysis
- **Visual Hierarchy**: Check heading structure, spacing, typography scale
- **Color System**: Verify color contrast ratios (WCAG AA/AAA compliance)
- **User Flow**: Analyze navigation patterns and interaction design
- **Micro-interactions**: Review hover states, transitions, animations
- **Empty States**: Check placeholder content and error messages

### 2. Responsive Design Review
- **Breakpoints**: Validate mobile/tablet/desktop layouts
- **Touch Targets**: Ensure minimum 44x44px tap areas on mobile
- **Viewport Meta**: Check mobile optimization settings
- **Flexible Layouts**: Review grid systems, flexbox/grid usage
- **Image Optimization**: Check responsive images and lazy loading

### 3. Accessibility (a11y) Audit
- **Semantic HTML**: Proper use of headings, landmarks, lists
- **ARIA Labels**: Check aria-label, aria-describedby, roles
- **Keyboard Navigation**: Tab order, focus indicators, skip links
- **Screen Reader**: Alt text, form labels, error announcements
- **Color Contrast**: Text vs background (4.5:1 for normal, 3:1 for large)
- **Focus Management**: Visible focus rings, logical tab flow

### 4. Component Architecture
- **Atomic Design**: Analyze atoms → molecules → organisms → templates
- **Component Reusability**: Identify duplicate patterns
- **Props API**: Review component interfaces and flexibility
- **Composition**: Check component composition patterns
- **State Management**: Analyze state lifting and prop drilling

### 5. Design System Consistency
- **Token Usage**: Verify spacing, colors, typography tokens
- **Component Variants**: Check consistent button/card/input styles
- **Icon System**: Review icon sizing and usage patterns
- **Shadow/Elevation**: Validate depth hierarchy
- **Border Radius**: Check roundness consistency

### 6. Performance & Optimization
- **Bundle Size**: Identify large dependencies
- **Lazy Loading**: Check code splitting opportunities
- **Image Formats**: Suggest WebP/AVIF usage
- **CSS-in-JS**: Review styled-components overhead
- **Render Performance**: Identify unnecessary re-renders

### 7. Modern Best Practices
- **Design Tokens**: CSS custom properties usage
- **Dark Mode**: Theme switching implementation
- **Loading States**: Skeleton screens, spinners, progressive loading
- **Error Boundaries**: Graceful error handling
- **Internationalization**: i18n readiness

## Usage Examples

```bash
# Full site design audit
/frontend-design full

# Analyze specific component
/frontend-design src/components/ScheduleTable.tsx

# Check accessibility of a page
/frontend-design src/pages/SwimmingSchedule.tsx

# Review component library
/frontend-design src/components/ui/
```

## Analysis Output Format

When invoked, I will provide:

### 📊 Design Score Card
- **Accessibility**: X/10
- **Responsiveness**: X/10
- **Visual Design**: X/10
- **Component Quality**: X/10
- **Performance**: X/10

### ✅ Strengths
List of well-implemented design patterns

### ⚠️ Issues Found
Categorized by severity (Critical, High, Medium, Low)

### 💡 Recommendations
Actionable improvements with code examples

### 🎨 Design Tokens Suggestions
Recommended design system improvements

## Specific Checks

### Color Contrast Analyzer
```typescript
// Check text contrast ratios
const contrastRatio = (foreground: string, background: string) => {
  // WCAG AA: 4.5:1 for normal text, 3:1 for large text
  // WCAG AAA: 7:1 for normal text, 4.5:1 for large text
}
```

### Touch Target Validator
```typescript
// Minimum sizes for mobile
const MIN_TOUCH_TARGET = {
  width: 44,  // 44px minimum
  height: 44,
  spacing: 8  // 8px minimum spacing between targets
}
```

### Focus Indicator Checker
```css
/* Visible focus states required */
:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}
```

## Integration with Current Project

For the swimming schedule project specifically:

### Current Strengths Observed
- ✅ shadcn/ui component library (excellent accessibility baseline)
- ✅ Tailwind CSS with custom design tokens
- ✅ Responsive mobile/desktop views
- ✅ Real-time updates with visual indicators
- ✅ Custom gradient system

### Areas for Enhancement
- 🎯 Add loading skeletons for data fetching
- 🎯 Improve empty state messaging
- 🎯 Add error boundaries for graceful failures
- 🎯 Enhance keyboard navigation for table
- 🎯 Add print styles for schedule
- 🎯 Implement progressive enhancement

## Common Design Patterns to Validate

### 1. Button States
```tsx
<Button
  variant="default"
  size="lg"
  disabled={isLoading}
  aria-busy={isLoading}
  aria-label="Load schedule"
>
  {isLoading ? <Spinner /> : 'Load'}
</Button>
```

### 2. Form Validation
```tsx
<Input
  type="time"
  aria-invalid={hasError}
  aria-describedby="time-error"
  aria-required="true"
/>
{hasError && <span id="time-error" role="alert">Invalid time</span>}
```

### 3. Data Tables
```tsx
<table role="table" aria-label="Swimming schedule">
  <caption className="sr-only">Competition schedule by day</caption>
  <thead>
    <tr>
      <th scope="col">Event No.</th>
      <th scope="col">Heat</th>
    </tr>
  </thead>
</table>
```

### 4. Modal Dialogs
```tsx
<Dialog
  role="dialog"
  aria-labelledby="modal-title"
  aria-modal="true"
>
  <h2 id="modal-title">Upload Schedule</h2>
  {/* Content */}
</Dialog>
```

## Automated Checks

When running this skill, I will automatically:

1. Scan all component files for accessibility issues
2. Check Tailwind classes for design token usage
3. Validate color contrast in CSS
4. Review component prop types
5. Identify missing ARIA labels
6. Check for proper semantic HTML
7. Analyze bundle size and imports
8. Verify responsive breakpoints

## Output Example

```markdown
# Frontend Design Analysis Report

## 📊 Overall Score: 8.2/10

### ✅ Strengths (12 found)
1. Excellent use of shadcn/ui accessible components
2. Custom gradient system with consistent theming
3. Proper semantic HTML structure
4. Mobile-responsive table with card view
5. Real-time updates with visual feedback
...

### ⚠️ Issues Found (8 issues)

#### 🔴 Critical (1)
- **Missing focus indicators on time inputs**
  Location: `ScheduleTable.tsx:278`
  Fix: Add `:focus-visible` styles

#### 🟡 Medium (5)
- **Color contrast ratio 3.2:1 on muted text**
  Location: `ScheduleTable.tsx:114`
  Required: 4.5:1 for WCAG AA

- **Missing loading states during file upload**
  Location: `SwimmingSchedule.tsx:208-227`
  Suggestion: Add skeleton loader

#### 🟢 Low (2)
- **Icon without aria-label**
  Location: Multiple trophy icons

### 💡 Recommendations

1. **Add Skeleton Loaders**
```tsx
{isLoading ? (
  <Skeleton className="h-12 w-full" />
) : (
  <ScheduleTable groups={processedGroups} />
)}
```

2. **Improve Focus Indicators**
```css
.custom-input:focus-visible {
  @apply ring-2 ring-primary ring-offset-2;
}
```

3. **Enhanced Empty States**
```tsx
<EmptyState
  icon={Calendar}
  title="No schedule loaded"
  description="Upload an Excel file or load the default schedule"
  action={<Button>Load Default</Button>}
/>
```
```

## Related Documentation
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- shadcn/ui Accessibility: https://ui.shadcn.com/docs/components
- Tailwind Accessibility: https://tailwindcss.com/docs/screen-readers
