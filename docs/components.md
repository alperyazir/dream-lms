# Dream LMS Component Library

Complete reference for Shadcn UI components and Dream LMS design system.

---

## Table of Contents

1. [Design System Overview](#design-system-overview)
2. [Color Palette](#color-palette)
3. [Neumorphic Shadows](#neumorphic-shadows)
4. [Typography](#typography)
5. [Component Library](#component-library)
6. [Usage Examples](#usage-examples)
7. [Dark Mode](#dark-mode)
8. [Import Patterns](#import-patterns)

---

## Design System Overview

Dream LMS uses a custom design system built on:
- **Shadcn UI** - Accessible component primitives built on Radix UI
- **Tailwind CSS v3** - Utility-first CSS framework
- **Inter Font** - Clean, modern typeface via Google Fonts
- **Neumorphic Design** - Subtle 3D effect with custom shadows

All design tokens are centralized in `frontend/src/lib/design-tokens.ts`.

---

## Color Palette

### Brand Colors

**Primary (Teal)**
- Main brand color for CTAs, links, and highlights
- Scale: `teal-50` through `teal-950`
- Primary shade: `teal-500` (#14B8A6)

```tsx
// Usage examples
<Button className="bg-teal-500 hover:bg-teal-600">Primary Button</Button>
<div className="text-teal-700 border-teal-200">Teal accents</div>
```

**Secondary (Cyan)**
- Accent color for gradients and secondary actions
- Scale: `cyan-50` through `cyan-950`
- Secondary shade: `cyan-500` (#06B6D4)

```tsx
// Usage examples
<Badge className="bg-cyan-100 text-cyan-800">Status Badge</Badge>
<div className="from-teal-500 to-cyan-500 bg-gradient-to-r">Gradient</div>
```

### Full Color Scales

| Shade | Teal (Primary) | Cyan (Secondary) |
|-------|----------------|------------------|
| 50    | #F0FDFA        | #ECFEFF          |
| 100   | #CCFBF1        | #CFFAFE          |
| 200   | #99F6E4        | #A5F3FC          |
| 300   | #5EEAD4        | #67E8F9          |
| 400   | #2DD4BF        | #22D3EE          |
| 500   | **#14B8A6**    | **#06B6D4**      |
| 600   | #0D9488        | #0891B2          |
| 700   | #0F766E        | #0E7490          |
| 800   | #115E59        | #155E75          |
| 900   | #134E4A        | #164E63          |
| 950   | #042F2E        | #083344          |

### System Colors (Shadcn Tokens)

These use CSS variables that automatically adapt to light/dark themes:

```tsx
background     // Page background
foreground     // Text color
card           // Card background
card-foreground // Card text
border         // Border color
input          // Input border
ring           // Focus ring
muted          // Muted background
muted-foreground // Muted text
```

---

## Neumorphic Shadows

Dream LMS uses custom neumorphic (soft 3D) shadows for depth and visual hierarchy.

### Shadow Utilities

| Class | Use Case | Definition |
|-------|----------|------------|
| `shadow-neuro-sm` | Subtle depth (buttons, badges) | `2px 2px 4px rgba(0,0,0,0.2), -2px -2px 4px rgba(255,255,255,0.05)` |
| `shadow-neuro` | Standard depth (cards, inputs) | `4px 4px 8px rgba(0,0,0,0.2), -4px -4px 8px rgba(255,255,255,0.05)` |
| `shadow-neuro-lg` | Prominent depth (modals, popovers) | `8px 8px 16px rgba(0,0,0,0.2), -8px -8px 16px rgba(255,255,255,0.05)` |

### Usage Examples

```tsx
// Card with neumorphic shadow
<Card className="shadow-neuro">
  <CardHeader>
    <CardTitle>Dashboard Card</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>

// Button with subtle neumorphic effect
<Button className="shadow-neuro-sm hover:shadow-neuro">
  Click Me
</Button>

// Modal dialog with prominent shadow
<Dialog>
  <DialogContent className="shadow-neuro-lg">
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

---

## Typography

### Font Family

**Inter** - Primary typeface for all text
- Loaded via Google Fonts CDN
- Weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

```tsx
// Applied by default via global CSS
// No className needed - all text uses Inter

// Monospace for code
<code className="font-mono">const code = true;</code>
```

### Font Sizes

| Class | Size | Use Case |
|-------|------|----------|
| `text-xs` | 12px | Fine print, captions |
| `text-sm` | 14px | Secondary text, labels |
| `text-base` | 16px | Body text (default) |
| `text-lg` | 18px | Subheadings |
| `text-xl` | 20px | Section titles |
| `text-2xl` | 24px | Page headings |
| `text-3xl` | 30px | Hero text |
| `text-4xl` | 36px | Large displays |

### Font Weights

```tsx
<p className="font-normal">Normal text (400)</p>
<p className="font-medium">Medium text (500)</p>
<p className="font-semibold">Semibold text (600)</p>
<p className="font-bold">Bold text (700)</p>
```

---

## Component Library

### Installed Components (34 total)

#### Form Components
- **button** - Primary interactive element
- **input** - Text input field
- **textarea** - Multi-line text input
- **select** - Dropdown selection
- **checkbox** - Boolean selection
- **radio** - Single choice from options
- **switch** - Toggle control
- **label** - Form field label
- **form** - Form wrapper with validation
- **field** - Custom field wrapper
- **input-group** - Grouped input elements
- **password-input** - Masked password field

#### Layout Components
- **card** - Content container
- **separator** - Visual divider
- **tabs** - Tabbed interface
- **table** - Data table
- **sheet** - Slide-out panel
- **drawer** - Side drawer navigation

#### Feedback Components
- **alert** - Notification banner
- **toast** - Temporary message
- **toaster** - Toast container
- **badge** - Status indicator
- **skeleton** - Loading placeholder

#### Overlay Components
- **dialog** - Modal dialog
- **popover** - Floating content
- **dropdown-menu** - Menu dropdown
- **menu** - Navigation menu

#### Interactive Components
- **avatar** - User profile image
- **pagination** - Page navigation
- **icon-button** - Icon-only button
- **link-button** - Link styled as button
- **close-button** - Close/dismiss button

#### Utility Components
- **provider** - Theme provider wrapper
- **color-mode** - Dark mode toggle

---

## Usage Examples

### Buttons

```tsx
import { Button } from '@/components/ui/button'

// Primary button (teal)
<Button className="bg-teal-500 hover:bg-teal-600">
  Primary Action
</Button>

// Secondary button
<Button variant="outline" className="border-cyan-500 text-cyan-700">
  Secondary Action
</Button>

// Destructive button
<Button variant="destructive">
  Delete
</Button>

// With neumorphic shadow
<Button className="shadow-neuro-sm">
  Shadowed Button
</Button>
```

### Cards

```tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

<Card className="shadow-neuro">
  <CardHeader>
    <CardTitle className="text-teal-700">Course Title</CardTitle>
    <CardDescription>Course description here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Main content area</p>
  </CardContent>
  <CardFooter>
    <Button className="bg-teal-500">Enroll Now</Button>
  </CardFooter>
</Card>
```

### Forms

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

<form className="space-y-4">
  <div>
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      placeholder="you@example.com"
      className="shadow-neuro-sm focus:ring-teal-500"
    />
  </div>

  <Button type="submit" className="bg-teal-500 hover:bg-teal-600 w-full">
    Submit
  </Button>
</form>
```

### Tables

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

<Card className="shadow-neuro">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="text-teal-700">Name</TableHead>
        <TableHead className="text-teal-700">Status</TableHead>
        <TableHead className="text-teal-700">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell className="font-medium">John Doe</TableCell>
        <TableCell>
          <Badge className="bg-cyan-100 text-cyan-800">Active</Badge>
        </TableCell>
        <TableCell>
          <Button variant="outline" size="sm">Edit</Button>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</Card>
```

### Dialogs

```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button className="bg-teal-500">Open Modal</Button>
  </DialogTrigger>
  <DialogContent className="shadow-neuro-lg">
    <DialogHeader>
      <DialogTitle className="text-teal-700">Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure you want to proceed?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button className="bg-teal-500">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Badges

```tsx
import { Badge } from '@/components/ui/badge'

// Success badge (teal)
<Badge className="bg-teal-100 text-teal-800">Completed</Badge>

// Info badge (cyan)
<Badge className="bg-cyan-100 text-cyan-800">In Progress</Badge>

// Warning badge
<Badge variant="outline" className="border-yellow-500 text-yellow-700">
  Pending
</Badge>
```

### Dropdowns

```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button className="bg-teal-500">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="shadow-neuro-lg">
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Toasts

```tsx
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

// Success toast
toast({
  title: "Success",
  description: "Your changes have been saved.",
  className: "border-teal-500",
})

// Error toast
toast({
  title: "Error",
  description: "Something went wrong.",
  variant: "destructive",
})
```

### Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs defaultValue="overview" className="w-full">
  <TabsList className="bg-muted">
    <TabsTrigger value="overview" className="data-[state=active]:bg-teal-500">
      Overview
    </TabsTrigger>
    <TabsTrigger value="settings" className="data-[state=active]:bg-teal-500">
      Settings
    </TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <p>Overview content</p>
  </TabsContent>
  <TabsContent value="settings">
    <p>Settings content</p>
  </TabsContent>
</Tabs>
```

---

## Dark Mode

Dream LMS supports automatic dark mode using `next-themes`.

### How Dark Mode Works

- Theme provider configured in `frontend/src/main.tsx`
- Uses CSS variable tokens that adapt to `.dark` class
- Components automatically inherit theme-aware colors
- Manual dark mode toggle available via `color-mode` component

### Theme-Aware Components

All Shadcn components use CSS variables that adapt to dark mode automatically:

```tsx
// These colors adapt automatically to light/dark mode
<Card className="bg-card text-card-foreground">
  <p className="text-muted-foreground">Secondary text</p>
</Card>
```

### Testing Dark Mode

```tsx
// Components should work in both themes without modification
<Button className="bg-teal-500 hover:bg-teal-600">
  Works in Light & Dark Mode
</Button>
```

### Color Mode Toggle

```tsx
import { ColorModeToggle } from '@/components/ui/color-mode'

<ColorModeToggle />
```

### Dark Mode Best Practices

1. **Use CSS variables** for backgrounds and text (`bg-card`, `text-foreground`)
2. **Test both themes** when styling custom components
3. **Preserve brand colors** - Teal/Cyan should stay consistent across themes
4. **Use neumorphic shadows** - They work well in both light and dark modes

---

## Import Patterns

### Standard Component Import

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
```

### Design Tokens Import

```tsx
import { colors, spacing, typography, shadows } from '@/lib/design-tokens'

// Use in inline styles or custom components
const customColor = colors.primary[500] // #14B8A6
const customSpacing = spacing.lg        // 1.5rem
```

### Tailwind Classes (Preferred)

```tsx
// Prefer Tailwind utilities over design tokens for consistency
<div className="bg-teal-500 p-4 shadow-neuro">
  Styled with Tailwind
</div>
```

---

## Quick Reference

### Common Patterns

**Primary CTA Button:**
```tsx
<Button className="bg-teal-500 hover:bg-teal-600 shadow-neuro-sm">
  Call to Action
</Button>
```

**Neumorphic Card:**
```tsx
<Card className="shadow-neuro border-teal-100">
  <CardContent>Content</CardContent>
</Card>
```

**Status Badge:**
```tsx
<Badge className="bg-cyan-100 text-cyan-800">Active</Badge>
```

**Gradient Background:**
```tsx
<div className="bg-gradient-to-r from-teal-500 to-cyan-500">
  Gradient element
</div>
```

**Focus Ring (Accessible):**
```tsx
<Input className="focus:ring-teal-500 focus:border-teal-500" />
```

---

## Migration from Chakra UI

If you're migrating from Chakra UI to Shadcn (Story 2.2), consult:
- `docs/chakra-to-shadcn-migration-guide.md` - Complete migration strategy
- `docs/chakra-to-tailwind-quick-ref.md` - Quick props translation

---

## Additional Resources

- **Shadcn Documentation:** https://ui.shadcn.com
- **Tailwind Documentation:** https://tailwindcss.com/docs
- **Radix UI (Primitives):** https://radix-ui.com
- **Design Tokens:** `frontend/src/lib/design-tokens.ts`
- **Tailwind Config:** `frontend/tailwind.config.ts`

---

**Last Updated:** 2025-10-28
**Maintained By:** Dream LMS Development Team
