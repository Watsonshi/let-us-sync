---
name: fix-typescript-strict
description: Automatically fix TypeScript strict mode errors including null checks, type assertions, and implicit any
user-invocable: true
disable-model-invocation: false
argument-hint: "[file-path]"
allowed-tools:
  - Read
  - Edit
  - Grep
  - Bash
---

# Fix TypeScript Strict Mode Errors

When invoked, this skill will:

1. **Analyze TypeScript files** for common strict mode violations:
   - Non-null assertions (`!`) that should be conditional checks
   - Implicit `any` types
   - Missing null/undefined checks
   - Unused variables and parameters

2. **Apply fixes**:
   - Replace `cursor!` with proper null checks
   - Add explicit type annotations
   - Add optional chaining (`?.`) where appropriate
   - Remove unused code or add `// @ts-expect-error` comments

3. **Validate changes**:
   - Run `npm run build` to check for errors
   - Report number of fixes applied

## Usage

```bash
# Fix specific file
/fix-typescript-strict src/pages/SwimmingSchedule.tsx

# Fix all files in a directory
/fix-typescript-strict src/
```

## Example Fixes

**Before:**
```typescript
cursor = moveOutOfLunch(cursor!, Ls, Le);
```

**After:**
```typescript
if (!cursor) {
  cursor = parseTimeInputToDate(base, '08:15');
}
cursor = moveOutOfLunch(cursor, Ls, Le);
```
