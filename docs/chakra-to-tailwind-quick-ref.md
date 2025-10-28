# Chakra → Tailwind Quick Reference Card

**Print this or keep it open in a second window while migrating!**

---

## 📦 Layout Components

| Chakra | Tailwind |
|--------|----------|
| `<Container>` | `<div className="max-w-7xl mx-auto px-4">` |
| `<Box>` | `<div className="">` |
| `<Flex>` | `<div className="flex">` |
| `<Stack>` (vertical) | `<div className="flex flex-col gap-4">` |
| `<Stack>` (horizontal) | `<div className="flex flex-row gap-4">` |

---

## 📐 Common Props

| Chakra | Tailwind |
|--------|----------|
| `p={4}` | `p-4` |
| `m={2}` | `m-2` |
| `px={6}` | `px-6` |
| `py={3}` | `py-3` |
| `gap={4}` | `gap-4` |
| `w="100%"` | `w-full` |
| `h="100vh"` | `h-screen` |
| `maxW="sm"` | `max-w-sm` |
| `bg="bg.muted"` | `bg-muted` |
| `color="white"` | `text-white` |
| `fontSize="sm"` | `text-sm` |
| `fontWeight="bold"` | `font-bold` |
| `truncate` | `truncate` |

---

## 🎯 Flex Props

| Chakra | Tailwind |
|--------|----------|
| `justify="space-between"` | `justify-between` |
| `justify="center"` | `justify-center` |
| `align="center"` | `items-center` |
| `direction="column"` | `flex-col` |
| `direction="row"` | `flex-row` |
| `wrap="wrap"` | `flex-wrap` |

---

## 📱 Responsive (Breakpoints)

| Chakra | Tailwind |
|--------|----------|
| `display={{ base: "none", md: "flex" }}` | `hidden md:flex` |
| `fontSize={{ base: "sm", md: "md" }}` | `text-sm md:text-base` |
| `p={{ base: 2, md: 4 }}` | `p-2 md:p-4` |

---

## 🎨 Position & Z-Index

| Chakra | Tailwind |
|--------|----------|
| `position="sticky"` | `sticky` |
| `position="absolute"` | `absolute` |
| `top={0}` | `top-0` |
| `zIndex={100}` | `z-[100]` |

---

## 📝 Typography

| Chakra | Tailwind |
|--------|----------|
| `<Text>` | `<p>` or `<span>` |
| `<Heading size="lg">` | `<h2 className="text-3xl font-bold">` |
| `<Heading size="md">` | `<h3 className="text-2xl font-bold">` |

---

## 🖼️ Images

| Chakra | Tailwind |
|--------|----------|
| `<Image src="..." alt="..." />` | `<img src="..." alt="..." className="..." />` |
| `maxW="2xs"` | `max-w-[320px]` |

---

## 🔧 Shadcn Components to Install

```bash
# Install all at once
npx shadcn-ui@latest add button card input select table dialog sheet dropdown-menu toast form badge tabs avatar

# Or install individually as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
```

---

## ⚠️ Already Have These (Keep!)

These components already exist in `frontend/src/components/ui/`:
- ✅ Button
- ✅ Field
- ✅ InputGroup
- ✅ PasswordInput
- ✅ Drawer
- ✅ Pagination
- ✅ Menu
- ✅ Dialog
- ✅ Checkbox
- ✅ Radio

**Just update imports if needed!**

---

## 🎨 Dream LMS Color Palette

```js
// Add to tailwind.config.ts
colors: {
  primary: {
    DEFAULT: '#14B8A6', // Teal 500
    50: '#F0FDFA',
    100: '#CCFBF1',
    // ... full teal scale
  },
  secondary: {
    DEFAULT: '#06B6D4', // Cyan 500
  }
}
```

---

## 🔍 Find Remaining Chakra Imports

```bash
# Search for Chakra imports
grep -r "@chakra-ui" frontend/src

# Search for Chakra components
grep -r "<Box\|<Flex\|<Stack\|<Container" frontend/src
```

---

## ✅ Testing Checklist (Per Page)

- [ ] Visual matches screenshot
- [ ] Responsive (mobile + desktop)
- [ ] Dark mode works
- [ ] All interactions work (forms, buttons, links)
- [ ] No console errors

---

**Full Guide:** `docs/chakra-to-shadcn-migration-guide.md`
