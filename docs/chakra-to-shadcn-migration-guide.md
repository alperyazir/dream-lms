# Chakra UI → Shadcn + Tailwind Migration Guide

**Purpose:** Prevent developer confusion during Epic 2 Story 2.1 migration by providing clear component mappings, layout patterns, and page-by-page checklists.

**Current Stack:** Chakra UI v3.27.0 + @emotion/react
**Target Stack:** Shadcn UI + Tailwind CSS + Radix UI primitives

---

## 📸 Visual Reference

Before migration screenshots are saved in: `docs/ss/`
- `login.png` - Login page with FastAPI branding
- `dashboard.png` - Dashboard layout with sidebar
- `admin.png` - Admin users table
- `user_settings.png` - Settings page with tabs

**IMPORTANT:** Reference these screenshots when migrating to ensure visual parity!

---

## 🎨 Current Design Tokens (To Preserve)

From screenshots, the current theme uses:
- **Primary Color:** Teal (#14B8A6 / Teal 500)
- **Background:** Dark theme with subtle grays
- **Spacing:** Consistent 4px base unit
- **Typography:** Clean sans-serif (likely Inter or similar)
- **Border Radius:** Medium (likely 8px)

These must be replicated in `tailwind.config.ts` during Story 2.1.

---

## 🔄 Component Mapping: Chakra → Shadcn

| Chakra UI Component | Shadcn Equivalent | Tailwind Alternative | Notes |
|---------------------|-------------------|---------------------|-------|
| `<Container>` | `<div>` | `max-w-7xl mx-auto px-4` | Use Tailwind utilities |
| `<Box>` | `<div>` | `<div className="">` | Direct replacement |
| `<Flex>` | `<div>` | `flex flex-row/col gap-4` | Use Tailwind flex utilities |
| `<Stack>` | `<div>` | `flex flex-col gap-4` | Vertical stack = flex-col |
| `<Image>` | `<img>` | `<img className="...">` | Direct replacement |
| `<Text>` | `<p>` or `<span>` | `<p className="text-sm">` | Use Tailwind typography |
| `<Heading>` | `<h1>` to `<h6>` | `<h2 className="text-2xl font-bold">` | Map size prop to Tailwind |
| `<Input>` | `@/components/ui/input` | Shadcn Input | Run `npx shadcn-ui@latest add input` |
| `<Button>` | `@/components/ui/button` | Shadcn Button | **Already exists!** Just update imports |
| `<Badge>` | `@/components/ui/badge` | Shadcn Badge | Run `npx shadcn-ui@latest add badge` |
| `<Table>` | `@/components/ui/table` | Shadcn Table | Run `npx shadcn-ui@latest add table` |
| `<IconButton>` | `<Button size="icon">` | Shadcn Button variant | Use icon variant |
| `<DrawerRoot>` | `@/components/ui/drawer` | Shadcn Drawer | **Already exists!** Update if needed |

---

## 🎯 Chakra Props → Tailwind Classes

### Spacing Props
```tsx
// Chakra
<Box p={4} m={2} px={6} py={3} gap={4} />

// Tailwind
<div className="p-4 m-2 px-6 py-3 gap-4" />
```

### Layout Props
```tsx
// Chakra
<Flex justify="space-between" align="center" direction="column" wrap="wrap" />

// Tailwind
<div className="flex justify-between items-center flex-col flex-wrap" />
```

### Sizing Props
```tsx
// Chakra
<Box w="100%" h="100vh" maxW="sm" minW="xs" />

// Tailwind
<div className="w-full h-screen max-w-sm min-w-[320px]" />
```

### Color Props
```tsx
// Chakra
<Box bg="bg.muted" color="white" />

// Tailwind (after defining in tailwind.config)
<div className="bg-muted text-white" />
```

### Typography Props
```tsx
// Chakra
<Text fontSize="sm" fontWeight="bold" truncate />

// Tailwind
<p className="text-sm font-bold truncate" />
```

### Position Props
```tsx
// Chakra
<Box position="sticky" top={0} zIndex={100} />

// Tailwind
<div className="sticky top-0 z-[100]" />
```

---

## 🧩 Layout Pattern Migrations

### Pattern 1: Centered Container (Login Page)
```tsx
// BEFORE (Chakra)
<Container
  h="100vh"
  maxW="sm"
  alignItems="stretch"
  justifyContent="center"
  gap={4}
  centerContent
>
  {children}
</Container>

// AFTER (Shadcn + Tailwind)
<div className="min-h-screen flex flex-col items-center justify-center gap-4 max-w-sm mx-auto px-4">
  {children}
</div>
```

### Pattern 2: Navbar Layout
```tsx
// BEFORE (Chakra)
<Flex
  justify="space-between"
  position="sticky"
  align="center"
  bg="bg.muted"
  w="100%"
  top={0}
  p={4}
>
  {children}
</Flex>

// AFTER (Shadcn + Tailwind)
<div className="sticky top-0 w-full flex justify-between items-center bg-muted p-4">
  {children}
</div>
```

### Pattern 3: Sidebar Layout
```tsx
// BEFORE (Chakra)
<Box
  display={{ base: "none", md: "flex" }}
  position="sticky"
  bg="bg.subtle"
  top={0}
  minW="xs"
  h="100vh"
  p={4}
>
  {children}
</Box>

// AFTER (Shadcn + Tailwind)
<div className="hidden md:flex sticky top-0 bg-subtle min-w-[320px] h-screen p-4">
  {children}
</div>
```

---

## 📋 Page-by-Page Migration Checklist

### ✅ Page 1: Login (`frontend/src/routes/login.tsx`)

**Current Chakra Components:**
- `Container` (form wrapper)
- `Image` (logo)
- `Input` (email field)
- `Field` (form field wrapper - custom UI, keep!)
- `InputGroup` (input with icon - custom UI, keep!)
- `PasswordInput` (custom UI, keep!)
- `Text` (signup text)

**Migration Steps:**
1. [ ] Replace `Container` with `<div className="min-h-screen flex flex-col items-center justify-center gap-4 max-w-sm mx-auto px-4">`
2. [ ] Replace `Image` with `<img className="h-auto max-w-[320px] mb-4" />`
3. [ ] Replace `Input` with Shadcn `Input` component (install first)
4. [ ] Keep `Field`, `InputGroup`, `PasswordInput` (already custom!)
5. [ ] Replace `Text` with `<p className="text-sm">`
6. [ ] Update link styling for "Forgot Password?" and "Sign Up" (apply teal color)
7. [ ] Test form submission still works
8. [ ] Test responsive layout (mobile + desktop)
9. [ ] Test dark mode
10. [ ] Compare with `docs/ss/login.png` for visual parity

**Acceptance Test:**
- Login form centered on page ✓
- Logo displays correctly ✓
- Email/password inputs work ✓
- Links are teal colored ✓
- Auth flow unchanged ✓

---

### ✅ Page 2: Navbar (`frontend/src/components/Common/Navbar.tsx`)

**Current Chakra Components:**
- `Flex` (navbar container)
- `Image` (logo)
- `useBreakpointValue` hook

**Migration Steps:**
1. [ ] Replace `Flex` with `<div className="hidden md:flex justify-between items-center sticky top-0 bg-muted w-full p-4">`
2. [ ] Replace `Image` with `<img className="max-w-[240px] p-2" />`
3. [ ] Replace `useBreakpointValue` with Tailwind responsive utilities (`hidden md:flex`)
4. [ ] Keep `UserMenu` component (already custom!)
5. [ ] Test navbar stays sticky on scroll
6. [ ] Test responsive hiding on mobile
7. [ ] Compare with `docs/ss/dashboard.png`

**Acceptance Test:**
- Navbar sticky at top ✓
- Logo on left, user menu on right ✓
- Hidden on mobile (<768px) ✓
- UserMenu dropdown works ✓

---

### ✅ Page 3: Sidebar (`frontend/src/components/Common/Sidebar.tsx`)

**Current Chakra Components:**
- `Box` (sidebar container)
- `Flex` (layout containers)
- `IconButton` (mobile menu trigger)
- `Text` (logged in user text)
- `DrawerRoot`, `DrawerBackdrop`, etc. (custom UI, keep!)

**Migration Steps:**
1. [ ] Replace desktop `Box` with `<div className="hidden md:flex sticky top-0 bg-subtle min-w-[320px] h-screen p-4">`
2. [ ] Replace `Flex` with `<div className="flex flex-col justify-between">`
3. [ ] Replace `IconButton` with Shadcn `Button` variant="ghost" size="icon"
4. [ ] Replace `Text` with `<p className="text-sm p-2 truncate max-w-sm">`
5. [ ] Keep all `Drawer*` components (already custom!)
6. [ ] Test mobile drawer opens/closes
7. [ ] Test desktop sidebar is always visible
8. [ ] Compare with `docs/ss/dashboard.png` and `docs/ss/admin.png`

**Acceptance Test:**
- Desktop sidebar always visible ✓
- Mobile hamburger menu opens drawer ✓
- SidebarItems render correctly ✓
- Logout button works ✓
- User email displays at bottom ✓

---

### ✅ Page 4: Admin (`frontend/src/routes/_layout/admin.tsx`)

**Current Chakra Components:**
- `Container` (page wrapper)
- `Heading` (page title)
- `Table.*` (data table components)
- `Badge` (user badge)
- `Flex` (pagination wrapper)
- `PaginationRoot`, etc. (custom UI, keep!)

**Migration Steps:**
1. [ ] Replace `Container` with `<div className="w-full max-w-7xl mx-auto px-4">`
2. [ ] Replace `Heading` with `<h1 className="text-3xl font-bold pt-12">`
3. [ ] Replace `Table.Root` with Shadcn `Table` (install first: `npx shadcn-ui@latest add table`)
4. [ ] Replace `Badge` with Shadcn `Badge` (install first: `npx shadcn-ui@latest add badge`)
5. [ ] Replace `Flex` with `<div className="flex justify-end mt-4">`
6. [ ] Keep `PaginationRoot` (already custom!)
7. [ ] Test table sorting/filtering still works
8. [ ] Test pagination navigation
9. [ ] Test UserActionsMenu (three-dot menu)
10. [ ] Compare with `docs/ss/admin.png`

**Acceptance Test:**
- "Users Management" heading displays ✓
- "Add User" button styled correctly (teal) ✓
- Table shows all columns (Full name, Email, Role, Status, Actions) ✓
- "You" badge appears next to current user ✓
- Pagination works ✓
- Actions menu (three dots) opens ✓

---

### ✅ Page 5: Settings (`frontend/src/routes/_layout/settings.tsx`)

**Migration Steps:**
1. [ ] Read current implementation
2. [ ] Replace Chakra tabs with Shadcn `Tabs` (install first)
3. [ ] Replace form components with Shadcn `Form` + React Hook Form
4. [ ] Replace buttons with Shadcn `Button`
5. [ ] Test tab switching
6. [ ] Test form validation
7. [ ] Compare with `docs/ss/user_settings.png`

**Acceptance Test:**
- Tabs render: "My profile", "Password", "Appearance" ✓
- Active tab highlighted ✓
- User info form displays correctly ✓
- "Edit" button styled correctly (teal) ✓
- Form submission works ✓

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Responsive Props Not Working
**Problem:** `display={{ base: "none", md: "flex" }}` doesn't translate directly
**Solution:** Use Tailwind responsive utilities: `hidden md:flex`

### Pitfall 2: Color Tokens Missing
**Problem:** Chakra semantic colors (`bg.muted`, `bg.subtle`) don't exist
**Solution:** Define in `tailwind.config.ts` under `theme.extend.colors`

### Pitfall 3: Spacing Inconsistency
**Problem:** Chakra uses numeric scale (1-12), Tailwind uses different scale
**Solution:** Create spacing mapping:
- Chakra `p={4}` = Tailwind `p-4` (both = 1rem/16px)
- Chakra `gap={2}` = Tailwind `gap-2` (both = 0.5rem/8px)

### Pitfall 4: Z-index Not Working
**Problem:** Chakra's `zIndex` prop uses semantic names
**Solution:** Use Tailwind arbitrary values: `z-[100]` or define in config

### Pitfall 5: Form Validation Breaks
**Problem:** Chakra's `invalid` prop doesn't exist on Shadcn components
**Solution:** Use `aria-invalid` attribute + custom styling

---

## 🛠️ Migration Workflow (Recommended)

### Phase 1: Setup (Story 2.1, Acceptance Criteria 1-8)
1. ✅ Keep Chakra installed temporarily (allows incremental migration)
2. ✅ Install Shadcn: `npx shadcn-ui@latest init`
3. ✅ Configure Tailwind with Dream LMS tokens
4. ✅ Install core Shadcn components (button, card, input, etc.)
5. ✅ Create `design-tokens.ts` file

### Phase 2: Migrate Pages One-by-One (Story 2.2)
For each page:
1. ✅ Take "before" screenshot
2. ✅ Follow page-specific checklist above
3. ✅ Replace Chakra imports with Shadcn/Tailwind
4. ✅ Test functionality (forms, navigation, interactions)
5. ✅ Test responsive design (mobile + desktop)
6. ✅ Test dark mode
7. ✅ Compare with original screenshot
8. ✅ Get approval before moving to next page

### Phase 3: Cleanup (Story 2.1, Acceptance Criteria 1)
1. ✅ Search codebase for remaining Chakra imports: `grep -r "@chakra-ui" frontend/src`
2. ✅ Remove Chakra: `npm uninstall @chakra-ui/react @emotion/react @emotion/styled`
3. ✅ Remove `frontend/src/theme.tsx` (Chakra theme file)
4. ✅ Update `frontend/src/main.tsx` to remove Chakra provider
5. ✅ Run full test suite
6. ✅ Final visual QA on all pages

---

## 🎨 Neumorphic Design System (Story 2.1 Goal)

After basic migration, apply Dream LMS's unique neumorphic aesthetic:

### Neumorphic Shadow Utilities (to add to tailwind.config.ts)
```js
boxShadow: {
  'neuro-sm': '2px 2px 4px rgba(0,0,0,0.2), -2px -2px 4px rgba(255,255,255,0.05)',
  'neuro': '4px 4px 8px rgba(0,0,0,0.2), -4px -4px 8px rgba(255,255,255,0.05)',
  'neuro-lg': '8px 8px 16px rgba(0,0,0,0.2), -8px -8px 16px rgba(255,255,255,0.05)',
}
```

### Example Neumorphic Card
```tsx
<Card className="bg-gradient-to-br from-slate-800 to-slate-900 shadow-neuro">
  <CardHeader>
    <CardTitle>Neumorphic Card</CardTitle>
  </CardHeader>
  <CardContent>
    This card has Dream LMS's signature neumorphic look!
  </CardContent>
</Card>
```

Apply neumorphic shadows to:
- Dashboard cards (Story 2.3)
- Book catalog items (Story 2.4)
- Activity player containers (Story 2.5)
- Modal dialogs
- Sidebar items on hover

---

## 📚 Quick Reference Links

**Shadcn Documentation:** https://ui.shadcn.com/
**Tailwind CSS Docs:** https://tailwindcss.com/docs
**Radix UI Primitives:** https://www.radix-ui.com/
**React Hook Form:** https://react-hook-form.com/
**TanStack Query:** https://tanstack.com/query

**Epic 2 Full Spec:** `docs/prd/epic-2-ui-migration-lms-pages-frontend-with-mock-data.md`
**Frontend Spec:** `docs/front-end-spec.md` (if exists)

---

## ✅ Final Checklist (Before Marking Story 2.1 Complete)

- [ ] All Chakra imports removed from codebase
- [ ] Chakra packages uninstalled from package.json
- [ ] All pages visually match original screenshots
- [ ] All functionality preserved (auth, forms, navigation)
- [ ] Responsive design works (mobile + desktop)
- [ ] Dark mode works on all pages
- [ ] Neumorphic design system applied consistently
- [ ] No console errors or warnings
- [ ] Performance is equal or better (check bundle size)
- [ ] Developer documentation updated (this guide + `/docs/components.md`)

---

**Questions or Issues?** Refer back to screenshots in `docs/ss/` or consult this guide!
