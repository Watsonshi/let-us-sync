# Accessibility Checklist

Quick reference for accessibility audits.

## Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical and intuitive
- [ ] Focus indicators are clearly visible
- [ ] No keyboard traps
- [ ] Skip to main content link present
- [ ] Escape key closes modals/dialogs

## Screen Readers
- [ ] All images have descriptive alt text
- [ ] Form inputs have associated labels
- [ ] Error messages are announced
- [ ] Loading states are announced (aria-live)
- [ ] Dynamic content updates are communicated
- [ ] Landmark regions are properly defined

## Color & Contrast
- [ ] Text contrast ratio ≥ 4.5:1 (normal text)
- [ ] Large text contrast ratio ≥ 3:1
- [ ] UI component contrast ≥ 3:1
- [ ] Information not conveyed by color alone
- [ ] Links are distinguishable from regular text

## Semantic HTML
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Lists use ul/ol/li elements
- [ ] Tables have proper structure (thead, tbody, th, td)
- [ ] Forms use fieldset and legend for grouping
- [ ] Buttons vs links used appropriately

## ARIA Attributes
- [ ] aria-label on icons without text
- [ ] aria-describedby for additional context
- [ ] aria-expanded on toggleable elements
- [ ] aria-current on active navigation items
- [ ] aria-hidden on decorative elements
- [ ] aria-live regions for dynamic updates

## Forms
- [ ] All inputs have labels
- [ ] Required fields are marked
- [ ] Error messages are specific and helpful
- [ ] Success confirmations are announced
- [ ] Input types are appropriate (email, tel, number)
- [ ] Autocomplete attributes for common fields

## Mobile & Touch
- [ ] Touch targets ≥ 44x44px
- [ ] Sufficient spacing between targets (8px min)
- [ ] Pinch to zoom is not disabled
- [ ] Orientation is not locked
- [ ] Content reflows at 320px width

## Testing Tools
- axe DevTools
- Lighthouse accessibility audit
- WAVE browser extension
- NVDA/JAWS screen readers
- VoiceOver (macOS/iOS)
