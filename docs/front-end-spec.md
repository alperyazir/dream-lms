# Dream LMS Front-End Specification

**Project:** Dream LMS
**Document Version:** 1.0 (Draft)
**Last Updated:** 2025-10-23
**Author:** Sally (UX Expert)

---

## Table of Contents

1. [Overview & Design Philosophy](#1-overview--design-philosophy)
2. [Design System & Component Library](#2-design-system--component-library)
3. [Component Architecture & Hierarchy](#3-component-architecture--hierarchy)
4. [Interactive Activity Players - Detailed Specifications](#4-interactive-activity-players---detailed-specifications)
5. [Data Visualization & Analytics](#5-data-visualization--analytics)
6. [Responsive Design & Breakpoints](#6-responsive-design--breakpoints)
7. [Animation & Micro-interactions](#7-animation--micro-interactions)
8. [Accessibility Implementation](#8-accessibility-implementation)

---

## 1. Overview & Design Philosophy

### Project Context

Dream LMS is a comprehensive learning management system that integrates with the FlowBook ecosystem, serving four distinct user roles (Admin, Publisher, Teacher, Student) with tailored experiences. The interface must balance professional credibility for educators with engaging, approachable design for students.

### Core Design Principles

1. **Clarity Over Complexity** - Every interface should communicate its purpose within 3 seconds
2. **Role-Optimized Experiences** - Each user role sees only what they need, when they need it
3. **Consistent Yet Contextual** - Maintain FlowBook's visual language while adapting to LMS workflows
4. **Accessibility First** - WCAG 2.1 Level AA compliance is non-negotiable, not an afterthought
5. **Progressive Disclosure** - Show essential information first, reveal complexity on demand
6. **Feedback at Every Step** - Users always know what's happening, what happened, and what's next
7. **Mobile-Considerate** - While desktop-optimized, critical student workflows must work on phones

### Visual Design Direction

- **Warm Professional Aesthetic** - Not corporate cold, not childishly playful
- **Color Psychology** - Blues/greens for trust and learning, warm accents for encouragement
- **Whitespace as a Feature** - Reduce cognitive load through generous spacing
- **Typography Hierarchy** - Clear information architecture through size, weight, and color
- **Iconography** - Lucide React icons for consistency, custom illustrations for delight

### Design Evolution from FlowBook

Dream LMS embraces a **modern, neumorphic aesthetic** that honors FlowBook's signature teal/cyan identity while evolving toward a more sophisticated, professional interface:

- **Soft Neumorphism** - Subtle depth through layered shadows and highlights
- **Gradient Foundations** - Flowing color transitions, never flat backgrounds
- **Glassmorphic Overlays** - Semi-transparent panels with backdrop blur
- **Geometric Fluidity** - Organic shapes inspired by modern dashboard design
- **Glow & Ambiance** - Soft glowing effects on interactive elements
- **Dark Mode First** - Equal design effort for light and dark themes

**Brand Heritage from FlowBook:**
- Signature teal/cyan gradients for trust and learning
- Navy blue for structure and readability
- Clean rounded corners throughout
- Generous whitespace and uncluttered layouts
- Green/red feedback for learning psychology

### Target Devices

- **Primary:** Desktop (1024px+) - Teachers and admin workflows
- **Secondary:** Tablet (768-1023px) - Activity completion, quick feedback
- **Tertiary:** Mobile (320-767px) - Student homework viewing, notifications

---

## 1.5. Template Integration Strategy

### FastAPI Template Frontend Foundation

Dream LMS frontend is built on the **FastAPI Full-Stack Template's** React application, providing a production-ready foundation with modern tooling and best practices. This template-first approach gives us:

**What We Keep from Template:**

**Infrastructure & Tooling:**
- React 18 + TypeScript setup with strict mode
- Vite build tool with optimized configuration
- TanStack Query (React Query) for server state management
- TanStack Router for type-safe routing (or React Router v6 - decision pending)
- Playwright E2E testing framework
- Docker multi-stage build setup
- Environment variable management
- Pre-commit hooks and ESLint configuration

**Authentication Flow:**
- Login page component structure
- Protected route patterns
- JWT token storage and management
- Auth context provider pattern
- API client with automatic token injection

**Core Patterns:**
- API service layer architecture
- React Hook patterns for data fetching
- Error boundary implementations
- Loading state management

### Hybrid Approach: Keep Infrastructure, Replace UI

**Strategy:** The template provides solid technical infrastructure (routing, state management, API integration) but uses Chakra UI for components. We'll keep the infrastructure and replace all UI layer components with Shadcn UI.

**UI Component Migration:**

```
Template (Chakra UI)         →    Dream LMS (Shadcn UI + Tailwind)
─────────────────────────────────────────────────────────────────
<ChakraProvider>             →    <ThemeProvider> (Shadcn)
<Box>, <Flex>, <Stack>       →    Tailwind utility classes
<Button>                     →    <Button> from shadcn/ui
<Input>, <FormControl>       →    <Input>, <Form> from shadcn/ui
<Modal>, <Dialog>            →    <Dialog>, <Sheet> from shadcn/ui
<useToast()>                 →    <Toaster> + toast() from shadcn/ui
<Table>                      →    <Table> with TanStack Table
<Menu>, <Popover>            →    <DropdownMenu>, <Popover> from shadcn/ui
```

**Why This Approach:**
- Avoid rewriting routing, authentication, and API layer (weeks of work)
- Leverage template's testing setup and Docker configuration
- Replace only the visual layer for neumorphic design system
- Maintain template's TypeScript patterns and code organization

### Shadcn MCP Integration for Rapid Development

**Development Workflow:**

During frontend development, developers will use the **Shadcn MCP server** to rapidly scaffold UI components. This enables:

**Component Generation:**
- Request Shadcn components via AI assistant
- Automatic installation of required dependencies (Radix UI primitives)
- Proper TypeScript typing and prop interfaces
- Accessibility features (ARIA attributes, keyboard navigation)
- Tailwind styling with design system colors

**Example Workflow:**
```
Developer: "Add a data table component for student roster with sorting and filtering"
MCP Response: Generates:
  - components/ui/table.tsx (Shadcn table primitives)
  - components/StudentRosterTable.tsx (domain-specific table)
  - Includes TanStack Table integration
  - Pre-styled with neumorphic shadows and teal accents
  - Keyboard navigation and screen reader support
```

**Benefits:**
- 10x faster component scaffolding vs manual coding
- Consistent component patterns across entire app
- Built-in accessibility and TypeScript safety
- Design system automatically applied

### Migration Checklist

**Phase 1: Foundation** (Week 1)
- [ ] Remove Chakra UI dependencies
- [ ] Install Shadcn UI CLI and core dependencies
- [ ] Set up Tailwind config with design system tokens
- [ ] Configure theme provider with dark mode support
- [ ] Migrate authentication pages (login, password reset)

**Phase 2: Core Components** (Week 2-3)
- [ ] Scaffold base components with Shadcn MCP (buttons, inputs, cards, dialogs)
- [ ] Build layout system (AppShell, Header, Sidebar)
- [ ] Implement notification system
- [ ] Create form components with React Hook Form integration

**Phase 3: Role Dashboards** (Week 4-6)
- [ ] Build dashboard layouts with neumorphic cards
- [ ] Implement charts with Recharts integration
- [ ] Create role-specific navigation and views
- [ ] Add responsive breakpoints and mobile navigation

**Phase 4: Domain Features** (Week 7-12)
- [ ] Assignment creation and management UI
- [ ] Activity players (drag-drop, matching, etc.)
- [ ] Analytics dashboards with advanced charts
- [ ] Messaging and feedback interfaces

### Routing Decision

**Current Template:** TanStack Router (type-safe, file-based routing)
**Original Plan:** React Router v6 (simpler, more familiar)

**Decision Pending:** Evaluate TanStack Router during foundation setup. If it integrates well with our patterns and provides value (type safety, better DX), keep it. Otherwise, migrate to React Router v6.

**Evaluation Criteria:**
- Learning curve vs productivity gain
- Type safety benefits for team
- Community support and documentation
- Integration with existing template code

---

## 2. Design System & Component Library

### Color System

#### Primary Palette (Teal/Cyan Family)

**Light Mode:**
```
Teal 500: #14B8A6 - Primary brand color, buttons, links
Cyan 500: #06B6D4 - Interactive highlights, active states
Teal 700: #0F766E - Hover states, pressed buttons
Teal 200: #99F6E4 - Subtle backgrounds, hover highlights
Teal 100: #CCFBF1 - Very light backgrounds, cards
Teal 50: #F0FDFA - Page backgrounds (gradient with white)
```

**Dark Mode:**
```
Teal 400: #2DD4BF - Primary brand (brighter for contrast)
Cyan 400: #22D3EE - Interactive highlights (glowing effect)
Teal 600: #0D9488 - Hover states
Teal 900: #134E4A - Dark surfaces with teal tint
Slate 900: #0F172A - Base background
Slate 800: #1E293B - Card/panel surfaces
```

#### Semantic Colors

**Success (Correct Answers, Positive Feedback):**
```
Light: #10B981 (Green 500)
Dark: #34D399 (Green 400 - glowing)
```

**Error (Incorrect Answers, Warnings):**
```
Light: #EF4444 (Red 500)
Dark: #F87171 (Red 400)
```

**Warning (Approaching Deadlines):**
```
Light: #F59E0B (Amber 500)
Dark: #FBBF24 (Amber 400)
```

**Info (Notifications, Tips):**
```
Light: #3B82F6 (Blue 500)
Dark: #60A5FA (Blue 400)
```

#### Neutral Scale

**Light Mode Text:**
```
Primary: #0F172A (Slate 900) - Headings, body text
Secondary: #334155 (Slate 700) - Subtext
Tertiary: #64748B (Slate 500) - Placeholders, disabled
Inverse: #FFFFFF - Text on colored backgrounds
```

**Dark Mode Text:**
```
Primary: #F1F5F9 (Slate 100) - Headings, body text
Secondary: #CBD5E1 (Slate 300) - Subtext
Tertiary: #94A3B8 (Slate 400) - Placeholders
Inverse: #0F172A - Text on light elements
```

**Borders & Dividers:**
```
Light: #E2E8F0 (Slate 200)
Dark: #334155 (Slate 700)
```

**Surfaces:**
```
Light: #FFFFFF, gradients to Teal 50
Dark: #1E293B, gradients to Teal 900
```

#### Role-Specific Accent Colors

```
Admin: #8B5CF6 (Purple 500 / 400) - Authority, system-wide control
Publisher: #F59E0B (Amber 500 / 400) - Content creation, distribution
Teacher: #14B8A6 (Teal 500 / 400) - Primary teal (main user)
Student: #10B981 (Green 500 / 400) - Growth, learning progress
```

### Background Gradients

#### Light Mode Backgrounds

```css
/* Page Background - Subtle teal wash */
background: linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 50%, #F0FDFA 100%);

/* Card/Panel Background - Soft glow */
background: linear-gradient(145deg, #FFFFFF 0%, #F0FDFA 100%);

/* Header Background - Stronger brand */
background: linear-gradient(90deg, #CCFBF1 0%, #99F6E4 100%);

/* Activity Player Background - Clean focus */
background: linear-gradient(180deg, #F0FDFA 0%, #FFFFFF 100%);
```

#### Dark Mode Backgrounds

```css
/* Page Background - Deep navy with teal hint */
background: linear-gradient(135deg, #0F172A 0%, #134E4A 50%, #0F172A 100%);

/* Card/Panel Background - Elevated surface */
background: linear-gradient(145deg, #1E293B 0%, #134E4A 100%);

/* Header Background - Glowing teal */
background: linear-gradient(90deg, #0D9488 0%, #14B8A6 100%);

/* Activity Player Background - Focused darkness */
background: linear-gradient(180deg, #134E4A 0%, #0F172A 100%);
```

### Typography Scale

#### Font Family

```
Primary: 'Inter', -apple-system, system-ui, sans-serif
Monospace: 'JetBrains Mono', 'Courier New', monospace
```

#### Type Scale

```
Display: 48px / 56px (3rem / 3.5rem) - Weight 700
H1: 36px / 44px (2.25rem / 2.75rem) - Weight 600
H2: 30px / 36px (1.875rem / 2.25rem) - Weight 600
H3: 24px / 32px (1.5rem / 2rem) - Weight 600
H4: 20px / 28px (1.25rem / 1.75rem) - Weight 500
Body Large: 16px / 24px (1rem / 1.5rem) - Weight 400
Body: 14px / 20px (0.875rem / 1.25rem) - Weight 400 ✅ Minimum
Body Small: 12px / 16px (0.75rem / 1rem) - Weight 400
```

**Font Weights:**
```
Regular: 400 (body)
Medium: 500 (emphasis)
Semibold: 600 (headings)
Bold: 700 (display, critical)
```

#### Text Color Application

**Light Mode:**
```
Headings: Slate 900
Body: Slate 700
Links: Teal 500 (hover: Teal 700)
Labels: Slate 600
```

**Dark Mode:**
```
Headings: Slate 100
Body: Slate 300
Links: Teal 400 (hover: Teal 300, with glow)
Labels: Slate 400
```

### Spacing System (8px Grid)

```
xs: 4px (0.25rem) - Icon gaps, tight spacing
sm: 8px (0.5rem) - Input padding, chips
md: 16px (1rem) - Default component spacing
lg: 24px (1.5rem) - Card padding, section gaps
xl: 32px (2rem) - Major section spacing
2xl: 48px (3rem) - Page-level spacing
3xl: 64px (4rem) - Hero sections
```

### Border Radius & Elevation

#### Border Radius

```
sm: 6px - Input fields, small buttons
md: 10px - Cards, regular buttons, badges
lg: 14px - Large cards, modals
xl: 20px - Feature panels, hero cards
2xl: 28px - Neumorphic elements
full: 9999px - Pills, avatars, circular buttons
```

#### Shadows (Neumorphic Approach)

**Light Mode:**

```css
/* Subtle Elevation - Input fields */
box-shadow:
  3px 3px 6px rgba(203, 213, 225, 0.4),
  -3px -3px 6px rgba(255, 255, 255, 0.9);

/* Card Elevation */
box-shadow:
  6px 6px 12px rgba(203, 213, 225, 0.5),
  -6px -6px 12px rgba(255, 255, 255, 1);

/* Modal/Dialog Elevation */
box-shadow:
  10px 10px 20px rgba(148, 163, 184, 0.3),
  -10px -10px 20px rgba(255, 255, 255, 0.8);

/* Active/Pressed (Inset) */
box-shadow:
  inset 4px 4px 8px rgba(203, 213, 225, 0.5),
  inset -4px -4px 8px rgba(255, 255, 255, 0.9);
```

**Dark Mode:**

```css
/* Subtle Elevation */
box-shadow:
  3px 3px 6px rgba(0, 0, 0, 0.4),
  -3px -3px 6px rgba(51, 65, 85, 0.3);

/* Card Elevation with Glow */
box-shadow:
  6px 6px 12px rgba(0, 0, 0, 0.5),
  -6px -6px 12px rgba(51, 65, 85, 0.2),
  0 0 20px rgba(20, 184, 166, 0.1); /* Teal glow */

/* Modal/Dialog */
box-shadow:
  10px 10px 30px rgba(0, 0, 0, 0.6),
  -10px -10px 30px rgba(51, 65, 85, 0.2),
  0 0 40px rgba(20, 184, 166, 0.15);

/* Active/Pressed */
box-shadow:
  inset 4px 4px 8px rgba(0, 0, 0, 0.5),
  inset -4px -4px 8px rgba(51, 65, 85, 0.2);
```

**Glow Effects (Interactive Elements):**

```css
/* Primary Button Hover (Light) */
box-shadow: 0 0 20px rgba(20, 184, 166, 0.4);

/* Primary Button Hover (Dark) */
box-shadow: 0 0 30px rgba(45, 212, 191, 0.6);

/* Active State Glow */
box-shadow: 0 0 40px rgba(20, 184, 166, 0.7);
```

### Shadcn UI Component Styling

#### Buttons

```tsx
/* Primary Button - Light Mode */
background: linear-gradient(135deg, #14B8A6, #0D9488);
box-shadow: 4px 4px 8px rgba(203, 213, 225, 0.4),
            -2px -2px 6px rgba(255, 255, 255, 0.9);
hover: filter brightness(1.1) + glow

/* Primary Button - Dark Mode */
background: linear-gradient(135deg, #2DD4BF, #14B8A6);
box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.5),
            0 0 20px rgba(45, 212, 191, 0.3);
hover: glow increases to 0.6
```

#### Cards

```tsx
/* Light Mode */
background: linear-gradient(145deg, #FFFFFF 0%, #F0FDFA 100%);
border: 1px solid #E2E8F0;
border-radius: 10px;
box-shadow: 6px 6px 12px rgba(203, 213, 225, 0.5),
            -6px -6px 12px rgba(255, 255, 255, 1);

/* Dark Mode */
background: linear-gradient(145deg, #1E293B 0%, #134E4A 100%);
border: 1px solid #334155;
box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.5),
            -6px -6px 12px rgba(51, 65, 85, 0.2),
            0 0 20px rgba(20, 184, 166, 0.1);
```

#### Input Fields

```tsx
/* Light Mode */
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 6px;
box-shadow: inset 2px 2px 4px rgba(203, 213, 225, 0.3);

/* Dark Mode */
background: #0F172A;
border: 1px solid #334155;
box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.4);
focus: border-color: #2DD4BF with glow
```

#### Modals/Dialogs

```tsx
/* Glassmorphic Overlay */
backdrop-filter: blur(8px);
background: rgba(15, 23, 42, 0.8); /* Dark overlay */

/* Modal Content - Light */
background: linear-gradient(145deg, #FFFFFF, #F0FDFA);
border-radius: 14px;
box-shadow: 10px 10px 20px rgba(148, 163, 184, 0.3),
            -10px -10px 20px rgba(255, 255, 255, 0.8);

/* Modal Content - Dark */
background: linear-gradient(145deg, #1E293B, #134E4A);
box-shadow: 10px 10px 30px rgba(0, 0, 0, 0.6),
            0 0 40px rgba(20, 184, 166, 0.15);
```

### FlowBook-Inspired Elements

#### Activity Player Frame

```tsx
/* Maintains FlowBook's signature navy border */
border: 3px solid #1E3A8A;
border-radius: 14px;
background: #FFFFFF (light) / #0F172A (dark);
padding: 24px;

/* Instruction Header (teal gradient) */
background: linear-gradient(90deg, #CCFBF1, #99F6E4);
color: #0F172A;
padding: 12px 24px;
border-radius: 10px 10px 0 0;
```

#### Sidebar Navigation (Left)

```tsx
/* Light Mode */
background: linear-gradient(180deg, #14B8A6, #0D9488);
width: 80px;
box-shadow: 4px 0 12px rgba(20, 184, 166, 0.2);

/* Dark Mode */
background: linear-gradient(180deg, #0D9488, #134E4A);
box-shadow: 4px 0 12px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(20, 184, 166, 0.2);

/* Icon Buttons */
background: rgba(255, 255, 255, 0.2);
border-radius: 12px;
hover: glow effect
```

#### Feedback Indicators

```tsx
/* Correct Answer */
background: linear-gradient(135deg, #10B981, #059669);
border: 2px solid #047857;
border-radius: 8px;
animation: pulse-green;

/* Incorrect Answer */
background: linear-gradient(135deg, #EF4444, #DC2626);
border: 2px solid #B91C1C;
animation: shake;
```

### Component States

All interactive components support:

```
Default: Neumorphic elevation, subtle shadows
Hover: Brightness increase + glow effect
Active: Inset shadow (pressed appearance)
Focus: Teal ring (2px offset, 0.5 opacity) + glow
Disabled: 50% opacity, no shadows
Loading: Skeleton with shimmer gradient (teal tint)
Error: Red border + red glow
Success: Green indicator + brief glow animation
```

### Dark Mode Implementation Strategy

**Theme Toggle:**
- Position: User settings + header quick toggle
- Transition: Smooth 300ms ease for all color/shadow changes
- Storage: LocalStorage persistence
- System preference detection on first load

**Component Adaptation:**
- All colors use CSS variables or Tailwind dark: prefix
- Shadows recalculated for dark backgrounds
- Glow effects amplified in dark mode
- Text contrast verified for WCAG AA

### Accessibility (WCAG 2.1 AA)

**Color Contrast Ratios:**
- Light Mode: All text ≥ 4.5:1 (verified against backgrounds)
- Dark Mode: All text ≥ 4.5:1 (brighter teal variants for links)
- UI Elements: ≥ 3:1 contrast

**Keyboard Navigation:**
- Tab order: logical, respects visual hierarchy
- Focus indicators: Visible teal ring (3px, 0.6 opacity)
- Skip links: "Skip to main content" for screen readers

**Touch Targets:**
- Minimum: 44px × 44px (mobile)
- Desktop buttons: 36px minimum height
- Interactive spacing: 8px minimum between targets

**Screen Reader Support:**
- aria-labels on all icons
- Role attributes on custom components
- Live regions for dynamic updates (notifications, scores)
- Form validation announced

**Motion & Animation:**
- Respect prefers-reduced-motion
- All animations disable gracefully
- No flashing content (seizure risk)

---

## 3. Component Architecture & Hierarchy

### From Chakra UI to Shadcn UI: Migration Overview

**Template's Original Stack:** Chakra UI (opinionated component library with built-in styling)
**Dream LMS Choice:** Shadcn UI + Tailwind CSS (flexible primitives + utility-first styling)

**Why Replace Chakra UI?**

| Aspect | Chakra UI (Template) | Shadcn UI + Tailwind (Dream LMS) |
|--------|----------------------|-----------------------------------|
| **Styling Approach** | CSS-in-JS (emotion) | Utility classes (Tailwind) |
| **Customization** | Theme overrides | Full component code ownership |
| **Design System** | Generic components | Custom neumorphic aesthetic |
| **Bundle Size** | All components bundled | Only used components included |
| **Flexibility** | Limited visual customization | Complete design control |
| **Dark Mode** | Built-in but generic | Custom gradients and glows |

**Migration Strategy:**

The FastAPI template's frontend already has routing, authentication, API layer, and state management working correctly. We preserve all that infrastructure and replace only the UI layer:

**Keep (Infrastructure):**
- ✅ TanStack Query for API calls
- ✅ TanStack Router (or React Router)
- ✅ Authentication context and protected routes
- ✅ API service layer with axios
- ✅ TypeScript types and interfaces
- ✅ Vite build configuration

**Replace (UI Layer):**
- ❌ Chakra UI components → Shadcn UI components
- ❌ Emotion CSS-in-JS → Tailwind utility classes
- ❌ Chakra theme → Custom design system tokens
- ❌ Generic styling → Neumorphic shadows and gradients

**Implementation Approach:**
1. Install Shadcn CLI and initialize with Tailwind config
2. Add design system tokens to `tailwind.config.ts`
3. Replace Chakra components one page at a time (start with login)
4. Use Shadcn MCP to rapidly generate new components
5. Maintain template's TypeScript patterns and file structure

### Component Architecture Overview

Dream LMS follows a **feature-based component architecture** organized by user role and functionality. This structure leverages React 18's concurrent features, TypeScript for type safety, and modern composition patterns.

**Architecture Principles:**

1. **Feature-First Organization** - Components grouped by domain (auth, assignments, analytics)
2. **Atomic Design Lite** - Base components → composed features (no strict methodology)
3. **Smart/Dumb Pattern** - Container components handle logic, presentational components render UI
4. **Composition Over Inheritance** - Flexible component composition using children and render props
5. **Single Responsibility** - Each component has one clear purpose
6. **Accessibility Baked In** - ARIA attributes and keyboard support in every component
7. **Shadcn Primitives** - Build on Radix UI primitives for accessibility and behavior

### Project Structure

```
frontend/
├── src/
│   ├── components/          # Shared/reusable components
│   │   ├── ui/             # Shadcn UI components (base primitives)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (30+ Shadcn components)
│   │   │
│   │   ├── layout/         # Layout components
│   │   │   ├── AppShell.tsx          # Main app container with header/sidebar
│   │   │   ├── Header.tsx            # Top navigation bar
│   │   │   ├── Sidebar.tsx           # Left sidebar navigation (FlowBook style)
│   │   │   ├── MobileNav.tsx         # Mobile drawer navigation
│   │   │   ├── PageContainer.tsx     # Page wrapper with padding
│   │   │   └── RoleBasedLayout.tsx   # Role-specific layout wrapper
│   │   │
│   │   ├── common/         # Common UI components
│   │   │   ├── Avatar.tsx            # User avatar with fallback
│   │   │   ├── Badge.tsx             # Status/type badges
│   │   │   ├── EmptyState.tsx        # Empty state illustrations
│   │   │   ├── ErrorBoundary.tsx     # Error catching wrapper
│   │   │   ├── LoadingSpinner.tsx    # Loading indicators
│   │   │   ├── PageHeader.tsx        # Page title with actions
│   │   │   ├── SearchBar.tsx         # Global search input
│   │   │   ├── StatCard.tsx          # Dashboard stat display
│   │   │   └── Breadcrumbs.tsx       # Navigation breadcrumbs
│   │   │
│   │   ├── notifications/  # Notification system
│   │   │   ├── NotificationBell.tsx      # Header bell icon with badge
│   │   │   ├── NotificationDropdown.tsx  # Dropdown panel
│   │   │   ├── NotificationList.tsx      # Scrollable list
│   │   │   ├── NotificationItem.tsx      # Single notification
│   │   │   └── NotificationPreferences.tsx # Settings panel
│   │   │
│   │   ├── charts/         # Data visualization wrappers
│   │   │   ├── LineChart.tsx         # Recharts line chart wrapper
│   │   │   ├── BarChart.tsx          # Recharts bar chart wrapper
│   │   │   ├── PieChart.tsx          # Recharts pie chart wrapper
│   │   │   ├── ProgressRing.tsx      # Circular progress indicator
│   │   │   └── TrendIndicator.tsx    # Up/down trend arrow with %
│   │   │
│   │   └── forms/          # Form components
│   │       ├── FormField.tsx         # Wrapper with label + error
│   │       ├── DatePicker.tsx        # Calendar date picker
│   │       ├── FileUpload.tsx        # Drag-and-drop file upload
│   │       ├── RichTextEditor.tsx    # Rich text for feedback/messages
│   │       └── MultiSelect.tsx       # Multi-select dropdown
│   │
│   ├── features/           # Feature-specific components
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── PasswordReset.tsx
│   │   │   └── FirstLoginPasswordChange.tsx
│   │   │
│   │   ├── dashboard/      # Role-specific dashboards
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── SystemStats.tsx
│   │   │   │   └── RecentActivity.tsx
│   │   │   ├── publisher/
│   │   │   │   ├── PublisherDashboard.tsx
│   │   │   │   └── ContentStats.tsx
│   │   │   ├── teacher/
│   │   │   │   ├── TeacherDashboard.tsx
│   │   │   │   ├── ClassOverview.tsx
│   │   │   │   ├── UpcomingDeadlines.tsx
│   │   │   │   └── QuickActions.tsx
│   │   │   └── student/
│   │   │       ├── StudentDashboard.tsx
│   │   │       ├── AssignmentSummary.tsx
│   │   │       ├── ProgressOverview.tsx
│   │   │       └── RecentFeedback.tsx
│   │   │
│   │   ├── users/          # User management
│   │   │   ├── UserList.tsx
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserForm.tsx
│   │   │   ├── BulkImportDialog.tsx
│   │   │   ├── BulkImportPreview.tsx
│   │   │   └── UserProfile.tsx
│   │   │
│   │   ├── classes/        # Class management
│   │   │   ├── ClassList.tsx
│   │   │   ├── ClassCard.tsx
│   │   │   ├── ClassDetail.tsx
│   │   │   ├── ClassForm.tsx
│   │   │   ├── StudentRoster.tsx
│   │   │   └── AddStudentsDialog.tsx
│   │   │
│   │   ├── books/          # Book catalog
│   │   │   ├── BookCatalog.tsx
│   │   │   ├── BookGrid.tsx
│   │   │   ├── BookCard.tsx
│   │   │   ├── BookDetail.tsx
│   │   │   ├── ActivityList.tsx
│   │   │   └── ActivityCard.tsx
│   │   │
│   │   ├── assignments/    # Assignment management
│   │   │   ├── AssignmentList.tsx
│   │   │   ├── AssignmentTable.tsx
│   │   │   ├── AssignmentCard.tsx
│   │   │   ├── AssignmentDetail.tsx
│   │   │   ├── CreateAssignmentDialog.tsx
│   │   │   │   ├── StepReview.tsx
│   │   │   │   ├── StepRecipients.tsx
│   │   │   │   ├── StepSettings.tsx
│   │   │   │   └── StepConfirm.tsx
│   │   │   ├── AssignmentResults.tsx
│   │   │   ├── StudentResultsTable.tsx
│   │   │   └── QuestionAnalysis.tsx
│   │   │
│   │   ├── activities/     # Activity players
│   │   │   ├── ActivityPlayer.tsx         # Main player container
│   │   │   ├── ActivityHeader.tsx         # Timer, progress, title
│   │   │   ├── ActivityFooter.tsx         # Submit, save, exit buttons
│   │   │   ├── ActivityResults.tsx        # Results screen
│   │   │   ├── players/
│   │   │   │   ├── DragDropPicturePlayer.tsx
│   │   │   │   ├── DragDropPictureGroupPlayer.tsx
│   │   │   │   ├── MatchTheWordsPlayer.tsx
│   │   │   │   ├── CirclePlayer.tsx
│   │   │   │   ├── MarkWithXPlayer.tsx
│   │   │   │   └── WordSearchPlayer.tsx
│   │   │   └── components/
│   │   │       ├── ProgressIndicator.tsx
│   │   │       ├── Timer.tsx
│   │   │       ├── DraggableWord.tsx
│   │   │       ├── DropZone.tsx
│   │   │       ├── SelectableArea.tsx
│   │   │       └── WordSearchGrid.tsx
│   │   │
│   │   ├── analytics/      # Analytics & reporting
│   │   │   ├── StudentPerformance.tsx
│   │   │   ├── ClassAnalytics.tsx
│   │   │   ├── PerformanceChart.tsx
│   │   │   ├── ScoreDistribution.tsx
│   │   │   ├── ActivityBreakdown.tsx
│   │   │   ├── ErrorPatterns.tsx
│   │   │   ├── Insights.tsx
│   │   │   ├── InsightCard.tsx
│   │   │   └── ReportBuilder.tsx
│   │   │
│   │   ├── messaging/      # Messaging system
│   │   │   ├── MessageList.tsx
│   │   │   ├── ConversationItem.tsx
│   │   │   ├── MessageThread.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ComposeMessage.tsx
│   │   │   └── MessageInput.tsx
│   │   │
│   │   ├── feedback/       # Teacher feedback
│   │   │   ├── FeedbackDialog.tsx
│   │   │   ├── FeedbackForm.tsx
│   │   │   ├── BadgeSelector.tsx
│   │   │   ├── EmojiPicker.tsx
│   │   │   ├── FeedbackDisplay.tsx
│   │   │   └── BadgeCollection.tsx
│   │   │
│   │   └── materials/      # Supplementary materials
│   │       ├── MaterialLibrary.tsx
│   │       ├── MaterialGrid.tsx
│   │       ├── MaterialCard.tsx
│   │       ├── UploadMaterialDialog.tsx
│   │       ├── ShareMaterialDialog.tsx
│   │       ├── MaterialViewer.tsx
│   │       └── PDFViewer.tsx
│   │
│   ├── pages/              # Route pages
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── ClassesPage.tsx
│   │   ├── ClassDetailPage.tsx
│   │   ├── BooksPage.tsx
│   │   ├── AssignmentsPage.tsx
│   │   ├── AssignmentDetailPage.tsx
│   │   ├── PlayActivityPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── MessagesPage.tsx
│   │   ├── MaterialsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts              # Authentication state
│   │   ├── useUser.ts              # Current user data
│   │   ├── useAssignments.ts       # Assignments queries
│   │   ├── useActivities.ts        # Activities data
│   │   ├── useNotifications.ts     # Notification polling
│   │   ├── useTheme.ts             # Dark mode toggle
│   │   ├── useDebounce.ts          # Debounced values
│   │   ├── useLocalStorage.ts      # LocalStorage sync
│   │   ├── useMediaQuery.ts        # Responsive breakpoints
│   │   └── useTimer.ts             # Activity timer logic
│   │
│   ├── services/           # API clients
│   │   ├── api.ts                  # Base axios instance
│   │   ├── authService.ts          # Auth endpoints
│   │   ├── userService.ts          # User CRUD
│   │   ├── assignmentService.ts    # Assignment CRUD
│   │   ├── activityService.ts      # Activity data
│   │   ├── analyticsService.ts     # Analytics data
│   │   ├── messageService.ts       # Messaging
│   │   └── storageService.ts       # Dream Central Storage proxy
│   │
│   ├── stores/             # Zustand state management
│   │   ├── authStore.ts            # Auth state (user, token)
│   │   ├── themeStore.ts           # Theme preference
│   │   ├── notificationStore.ts    # Notification state
│   │   └── activityStore.ts        # Activity player state
│   │
│   ├── lib/                # Utilities
│   │   ├── utils.ts                # General utilities
│   │   ├── cn.ts                   # Class name merger
│   │   ├── validators.ts           # Zod schemas
│   │   ├── formatters.ts           # Date, number formatting
│   │   └── constants.ts            # App constants
│   │
│   ├── types/              # TypeScript types
│   │   ├── api.ts                  # API response types
│   │   ├── user.ts                 # User domain types
│   │   ├── assignment.ts           # Assignment types
│   │   ├── activity.ts             # Activity config types
│   │   ├── analytics.ts            # Analytics types
│   │   └── index.ts                # Type exports
│   │
│   ├── styles/             # Global styles
│   │   ├── globals.css             # Tailwind + global styles
│   │   └── themes.css              # Light/dark theme variables
│   │
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── router.tsx          # React Router config
```

### State Management Strategy

**Zustand (Client State):**
- Auth state (user, token, role)
- Theme preference (light/dark)
- UI state (sidebar open/closed, modals)
- Activity player state (current question, answers)

**TanStack Query (Server State):**
- All API data (users, assignments, analytics)
- Automatic caching and invalidation
- Optimistic updates
- Background refetching

**Example: useAssignments Hook**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAssignments() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: assignmentService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: assignmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['assignments']);
      toast.success('Assignment created!');
    },
  });

  return {
    assignments: data ?? [],
    isLoading,
    createAssignment: createMutation.mutate,
  };
}
```

### Accessibility Implementation

**Every component must:**

1. **Keyboard Navigation:**
```tsx
<Button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  tabIndex={0}
/>
```

2. **ARIA Attributes:**
```tsx
<div
  role="alert"
  aria-live="polite"
  aria-atomic="true"
>
  {errorMessage}
</div>
```

3. **Focus Management:**
```tsx
const dialogRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isOpen) {
    dialogRef.current?.focus();
  }
}, [isOpen]);
```

4. **Screen Reader Announcements:**
```tsx
<span className="sr-only">
  Loading assignments...
</span>
```

---

## 4. Interactive Activity Players - Detailed Specifications

### Asset Loading Strategy

Dream LMS uses **pre-signed URL transformation** to load all book assets (images, audio) from Dream Central Storage (MinIO).

**Architecture:**

1. **Backend transforms relative paths** from book `config.json` to MinIO pre-signed URLs
2. **Frontend receives ready-to-use URLs** with 1-hour expiration
3. **Direct browser → MinIO connection** for optimal performance

**Backend Implementation Pattern:**

```python
# Backend transforms this:
"section_path": "./books/SwitchtoCLIL/images/HB/modules/M1/pages/p8s1.png"

# Into this (pre-signed MinIO URL):
"section_path": "https://minio.yourdomain.com/dream-central-storage/books/SwitchtoCLIL/images/HB/modules/M1/pages/p8s1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=..."
```

**Frontend Usage:**

```typescript
// All paths are pre-signed URLs ready for direct use
<img src={activity.section_path} alt="Activity background" />
<audio src={section.audio_path} controls />
```

**Benefits:**
- ✅ Secure (URLs expire after 1 hour)
- ✅ Fast (direct browser → MinIO, no backend bottleneck)
- ✅ Cacheable (browser can cache assets)
- ✅ Publisher content protected (requires authentication to get URLs)

---

### Book Data Structure & TypeScript Interfaces

**Core Types:**

```typescript
// Base coordinate system
interface Coordinates {
  x: number;      // Absolute position in pixels
  y: number;
  w: number;      // Width
  h: number;      // Height
}

// Book configuration structure
interface BookConfig {
  publisher_name: string;
  publisher_logo_path: string;  // Transformed to pre-signed URL
  book_title: string;
  book_cover: string;            // Transformed to pre-signed URL
  books: Book[];
}

interface Book {
  type: number;
  name: string;
  is_module_side_left: boolean;
  modules: Module[];
}

interface Module {
  name: string;
  pages: Page[];
}

interface Page {
  page_number: number;
  image_path: string;            // Transformed to pre-signed URL
  sections: Section[];
}

// Section can be audio, activity, or other types
interface Section {
  title?: string;
  type: "audio" | "fill" | string;
  coords: Coordinates;           // Icon position on page image
  audio_path?: string;           // Transformed to pre-signed URL (if audio)
  answer?: any[];
  activity?: Activity;           // Activity configuration
}

// Union type for all activity types
type Activity =
  | DragDropPictureActivity
  | DragDropPictureGroupActivity
  | MatchTheWordsActivity
  | CircleActivity
  | MarkWithXActivity
  | PuzzleFindWordsActivity;

// Base activity interface
interface BaseActivity {
  type: string;
  coords: Coordinates;           // Activity icon position (can be ignored in player)
}
```

---

### Activity Type 1: dragdroppicture

**Purpose:** Drag words from a word bank onto specific drop zones positioned on a background image.

**TypeScript Interface:**

```typescript
interface DragDropPictureActivity extends BaseActivity {
  type: "dragdroppicture";
  section_path: string;          // Background image (pre-signed URL)
  words: string[];               // Draggable word bank
  answer: DragDropAnswer[];      // Correct placements
}

interface DragDropAnswer {
  no: number;                    // Answer sequence number
  coords: Coordinates;           // Drop zone position on image
  text: string;                  // Correct word for this zone
}
```

**Example JSON (after backend transformation):**

```json
{
  "type": "dragdroppicture",
  "coords": { "x": 20, "y": 265, "w": 44, "h": 44 },
  "section_path": "https://minio.yourdomain.com/.../p8s1.png?X-Amz-...",
  "words": ["capital", "old", "nice"],
  "answer": [
    {
      "no": 1,
      "coords": { "x": 594, "y": 594, "w": 174, "h": 45 },
      "text": "nice"
    },
    {
      "no": 1,
      "coords": { "x": 1144, "y": 495, "w": 174, "h": 45 },
      "text": "capital"
    }
  ]
}
```

**Visual Specifications:**

```
┌─────────────────────────────────────────────────────┐
│  Instruction Header (Teal Gradient)                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Word Bank (Top - Draggable Chips):                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ capital  │  │   old    │  │   nice   │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │                                             │  │
│  │   Background Image (section_path)          │  │
│  │                                             │  │
│  │         ┌──────────────┐  ← Drop Zone      │  │
│  │         │ [Drop Here]  │    (from coords)  │  │
│  │         └──────────────┘                    │  │
│  │                                             │  │
│  │   ┌──────────────┐                         │  │
│  │   │ [Drop Here]  │                         │  │
│  │   └──────────────┘                         │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  Completed: 0 / 3                                   │
└─────────────────────────────────────────────────────┘
```

**Component Styling:**

```tsx
// Word Chip (Draggable)
background: linear-gradient(135deg, #FFFFFF, #F0FDFA)
border: 2px solid #14B8A6
border-radius: 8px
padding: 8px 16px
cursor: grab
font-weight: 500

hover:
  transform: translateY(-2px)
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3)

dragging:
  opacity: 0.5
  cursor: grabbing

used:
  opacity: 0.3
  pointer-events: none
```

```tsx
// Drop Zone (Empty)
position: absolute
left: {coords.x}px
top: {coords.y}px
width: {coords.w}px
height: {coords.h}px
border: 2px dashed #CBD5E1
border-radius: 8px
background: rgba(255, 255, 255, 0.8)

hover (while dragging):
  border-color: #14B8A6
  border-style: solid
  background: rgba(20, 184, 166, 0.1)
```

```tsx
// Drop Zone (Filled)
border: 2px solid #14B8A6
background: linear-gradient(135deg, #CCFBF1, #99F6E4)
display: flex
align-items: center
justify-content: center

// Remove button
button (top-right):
  background: #EF4444
  border-radius: full
  width: 20px
  height: 20px
  icon: X
```

```tsx
// Drop Zone (Correct - Results View)
border: 2px solid #10B981
background: linear-gradient(135deg, #D1FAE5, #A7F3D0)
icon: CheckCircle (top-right)
color: #047857
```

```tsx
// Drop Zone (Incorrect - Results View)
border: 2px solid #EF4444
background: linear-gradient(135deg, #FEE2E2, #FECACA)

// Student's answer (crossed out)
text-decoration: line-through
color: #DC2626

// Correct answer shown below
correct-text:
  color: #047857
  font-size: 12px
  ::before: "Correct: "
```

**Interaction Pattern:**

```typescript
// Desktop
1. User drags word chip from word bank
2. Drop zones highlight when word hovers over them
3. Drop word into zone → validates against answer[].text
4. If correct: green animation, lock zone
5. If incorrect: red flash, word returns to bank

// Mobile
1. Tap word chip (becomes selected/blue)
2. Tap drop zone
3. Word moves to zone with animation
4. Validation same as desktop
```

**Scoring:**

```typescript
function scoreActivity(userAnswers: Map<number, string>, correctAnswers: DragDropAnswer[]): number {
  let correct = 0;

  correctAnswers.forEach(answer => {
    const dropZoneId = `${answer.coords.x}-${answer.coords.y}`;
    if (userAnswers.get(dropZoneId) === answer.text) {
      correct++;
    }
  });

  return Math.round((correct / correctAnswers.length) * 100);
}
```

---

### Activity Type 2: dragdroppicturegroup

**Purpose:** Drag words into categorized groups (similar to dragdroppicture but validates group membership, not exact position).

**TypeScript Interface:**

```typescript
interface DragDropPictureGroupActivity extends BaseActivity {
  type: "dragdroppicturegroup";
  section_path: string;          // Background image
  words: string[];               // Draggable words
  answer: DragDropGroupAnswer[]; // Group-based answers
}

interface DragDropGroupAnswer {
  no: number;                    // Group number/ID
  coords: Coordinates;           // Group drop zone area
  text: string;                  // Correct word for this group
}
```

**Key Difference from dragdroppicture:**

- Multiple items can be in the same group zone
- Validation checks if word belongs to correct group (matching `no` field)
- Groups are larger areas, not exact positions

**Visual Specifications:**

```
┌─────────────────────────────────────────────────────┐
│  Group 1        │  Group 2        │  Group 3        │
│  (answer[].no=1)│  (answer[].no=2)│  (answer[].no=3)│
│                 │                 │                 │
│  ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │
│  │ word1      │ │ │            │ │ │            │ │
│  └────────────┘ │ └────────────┘ │ └────────────┘ │
│  ┌────────────┐ │                 │                 │
│  │ word2      │ │                 │                 │
│  └────────────┘ │                 │                 │
└─────────────────────────────────────────────────────┘
```

**Scoring:**

```typescript
function scoreGroupActivity(userAnswers: Map<string, number>, correctAnswers: DragDropGroupAnswer[]): number {
  let correct = 0;

  correctAnswers.forEach(answer => {
    const userGroupNo = userAnswers.get(answer.text);
    if (userGroupNo === answer.no) {
      correct++;
    }
  });

  return Math.round((correct / correctAnswers.length) * 100);
}
```

---

### Activity Type 3: matchTheWords

**Purpose:** Match terms from the left column with definitions/translations in the right column.

**TypeScript Interface:**

```typescript
interface MatchTheWordsActivity extends BaseActivity {
  type: "matchTheWords";
  headerText: string;                  // Instruction text
  match_words: MatchWord[];            // Terms to match
  sentences: MatchSentence[];          // Definitions with correct answers
}

interface MatchWord {
  word: string;                        // Term (e.g., "a. tolerance")
}

interface MatchSentence {
  sentence: string;                    // Definition text
  word: string;                        // Correct matching term
}
```

**Example JSON:**

```json
{
  "type": "matchTheWords",
  "coords": { "x": 637, "y": 159, "w": 36, "h": 38 },
  "headerText": "match the words with the correct definitions.",
  "match_words": [
    { "word": "a. tolerance" },
    { "word": "b. various" },
    { "word": "c. local" }
  ],
  "sentences": [
    {
      "sentence": "1. the area, city or town that you live in",
      "word": "c. local"
    },
    {
      "sentence": "2. willingness to accept feelings...",
      "word": "a. tolerance"
    }
  ]
}
```

**Visual Specifications:**

```
┌─────────────────────────────────────────────────────┐
│  match the words with the correct definitions.      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Definitions (Left)        Terms (Right)            │
│                                                     │
│  ┌─────────────────────┐  ┌─────────────────┐     │
│  │ 1. the area, city   │──│ c. local        │     │ ← Matched
│  │    or town that...  │  └─────────────────┘     │
│  └─────────────────────┘                           │
│                                                     │
│  ┌─────────────────────┐  ┌─────────────────┐     │
│  │ 2. willingness to   │  │ a. tolerance    │     │ ← Available
│  │    accept feelings  │  └─────────────────┘     │
│  └─────────────────────┘                           │
│         ↑ Selected                                  │
│                          ┌─────────────────┐     │
│  ┌─────────────────────┐ │ b. various      │     │
│  │ 3. more than one;   │ └─────────────────┘     │
│  │    several          │                           │
│  └─────────────────────┘                           │
│                                                     │
│  Matched: 1 / 3                                     │
└─────────────────────────────────────────────────────┘
```

**Component Styling:**

```tsx
// Sentence Card (Left Column)
background: #FFFFFF (light) / #1E293B (dark)
border: 2px solid #E2E8F0
border-radius: 10px
padding: 16px
cursor: pointer

selected:
  border: 2px solid #3B82F6
  background: #DBEAFE
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4)

matched:
  border: 2px solid #10B981
  background: linear-gradient(135deg, #D1FAE5, #A7F3D0)
  opacity: 0.8
  pointer-events: none
```

```tsx
// Word Card (Right Column)
// Same styling as sentence cards

// Connecting Line (SVG)
line:
  stroke: #10B981
  stroke-width: 3px
  stroke-dasharray: 5, 5
  animation: dash 1s linear
```

**Interaction Pattern:**

```typescript
// Desktop - Click to Match
1. Click sentence (left) - becomes blue/selected
2. Click word (right) - creates match
3. If correct: green animation, draw connecting line, lock both
4. If incorrect: red flash, deselect

// Mobile - Same as desktop (tap instead of click)

// Keyboard
Tab: Navigate cards
Space/Enter: Select card or confirm match
U: Unmatch selected pair
```

**Scoring:**

```typescript
function scoreMatchActivity(userMatches: Map<string, string>, sentences: MatchSentence[]): number {
  let correct = 0;

  sentences.forEach(sentence => {
    if (userMatches.get(sentence.sentence) === sentence.word) {
      correct++;
    }
  });

  return Math.round((correct / sentences.length) * 100);
}
```

---

### Activity Type 4: circle (Multi-Select / True-False / Multiple Choice)

**Purpose:** Click/tap rectangles on an image to select answers. Used for true/false (circleCount=2) or multiple choice (circleCount varies).

**TypeScript Interface:**

```typescript
interface CircleActivity extends BaseActivity {
  type: "circle";
  circleCount: number;               // How many items to select (default: 3)
  section_path: string;              // Background image
  answer: CircleAnswer[];            // All selectable areas
}

interface CircleAnswer {
  coords: Coordinates;               // Clickable area position
  isCorrect: boolean;                // Whether this area is a correct answer
}
```

**Example JSON (True/False scenario):**

```json
{
  "type": "circle",
  "circleCount": 2,
  "section_path": "https://minio.../p23s2.PNG",
  "coords": { "x": 20, "y": 224, "w": 44, "h": 44 },
  "answer": [
    { "coords": { "x": 473, "y": 229, "w": 128, "h": 44 }, "isCorrect": false },
    { "coords": { "x": 635, "y": 228, "w": 128, "h": 44 }, "isCorrect": true },
    { "coords": { "x": 275, "y": 296, "w": 76, "h": 41 }, "isCorrect": true }
  ]
}
```

**Visual Specifications:**

```
┌─────────────────────────────────────────────────────┐
│  Background Image with Overlaid Selection Areas     │
│                                                     │
│  ┌─────────┐ ← Clickable area (isCorrect: false)   │
│  │ Option A│                                        │
│  └─────────┘                                        │
│                                                     │
│      ✓ ┌─────────┐ ← Selected (isCorrect: true)    │
│        │ Option B│                                  │
│        └─────────┘                                  │
│                                                     │
│  ┌─────────┐ ← Unselected (isCorrect: true)        │
│  │ Option C│                                        │
│  └─────────┘                                        │
│                                                     │
│  Selected: 1 / 2 (circleCount)                      │
└─────────────────────────────────────────────────────┘
```

**Component Styling:**

```tsx
// Selectable Area (Unselected)
position: absolute
left: {coords.x}px
top: {coords.y}px
width: {coords.w}px
height: {coords.h}px
border: 3px solid transparent
border-radius: 8px
cursor: pointer
transition: all 0.2s

hover:
  border-color: #14B8A6
  background: rgba(20, 184, 166, 0.1)
```

```tsx
// Selectable Area (Selected)
border: 3px solid #3B82F6
background: rgba(59, 130, 246, 0.2)

// Checkmark badge
badge:
  position: absolute
  top: -12px
  right: -12px
  width: 32px
  height: 32px
  background: #3B82F6
  border-radius: full
  icon: Check
  color: #FFFFFF
```

```tsx
// Selectable Area (Correct - Results)
border: 3px solid #10B981
background: rgba(16, 185, 129, 0.2)
badge:
  background: #10B981
  icon: CheckCircle
```

```tsx
// Selectable Area (Incorrect - Results)
border: 3px solid #EF4444
background: rgba(239, 68, 68, 0.2)
badge:
  background: #EF4444
  icon: XCircle
```

**Interaction Pattern:**

```typescript
// Click to toggle selection
// If circleCount reached and user clicks unselected area:
//   - Deselect first selected item
//   - Select new item (FIFO behavior)
// OR disable further selections until user deselects
```

**Scoring:**

```typescript
function scoreCircleActivity(
  selectedCoords: Set<string>,
  answers: CircleAnswer[]
): number {
  let correct = 0;
  let incorrect = 0;

  answers.forEach(answer => {
    const coordKey = `${answer.coords.x}-${answer.coords.y}`;
    const wasSelected = selectedCoords.has(coordKey);

    if (wasSelected && answer.isCorrect) {
      correct++;
    } else if (wasSelected && !answer.isCorrect) {
      incorrect++;
    }
  });

  const totalCorrect = answers.filter(a => a.isCorrect).length;

  // Penalty for incorrect selections
  const score = ((correct - incorrect) / totalCorrect) * 100;

  return Math.max(0, Math.round(score)); // Never below 0
}
```

---

### Activity Type 5: markwithx

**Purpose:** Identical to `circle` activity, but uses X marker instead of checkmark for visual variety.

**TypeScript Interface:**

```typescript
// Same as CircleActivity
interface MarkWithXActivity extends BaseActivity {
  type: "markwithx";
  circleCount: number;
  section_path: string;
  answer: CircleAnswer[];  // Reuses same answer structure
}
```

**Visual Difference:**

```tsx
// Selected badge uses X icon instead of Check
badge:
  icon: X (instead of Check)
  background: #3B82F6
```

**All other specifications same as circle activity.**

---

### Activity Type 6: puzzleFindWords (Word Search)

**Purpose:** Find words in an auto-generated letter grid. Only word list is provided in JSON; grid is generated client-side.

**TypeScript Interface:**

```typescript
interface PuzzleFindWordsActivity extends BaseActivity {
  type: "puzzleFindWords";
  headerText: string;                // Instruction text
  words: string[];                   // Words to find (grid auto-generated)
}
```

**Example JSON:**

```json
{
  "type": "puzzleFindWords",
  "headerText": "Welche internationalen Wörter sind das?",
  "coords": { "x": 37, "y": 305, "w": 44, "h": 44 },
  "words": [
    "HOTEL",
    "EIS",
    "GITARRE",
    "GARTEN",
    "ANANAS",
    "HAMBURGER",
    "TAXI",
    "FILM",
    "PARK"
  ]
}
```

**Grid Generation Algorithm:**

```typescript
interface WordSearchGrid {
  grid: string[][];              // 2D array of letters
  placements: WordPlacement[];   // Word positions for validation
}

interface WordPlacement {
  word: string;
  startRow: number;
  startCol: number;
  direction: 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up';
  endRow: number;
  endCol: number;
}

function generateWordSearchGrid(words: string[], gridSize: number = 12): WordSearchGrid {
  // 1. Create empty grid
  const grid: string[][] = Array(gridSize).fill(null).map(() =>
    Array(gridSize).fill('')
  );

  const placements: WordPlacement[] = [];

  // 2. Place each word randomly
  words.forEach(word => {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 100) {
      const direction = randomDirection();
      const { row, col } = randomStartPosition(word.length, direction, gridSize);

      if (canPlaceWord(grid, word, row, col, direction)) {
        placeWord(grid, word, row, col, direction);
        placements.push({
          word,
          startRow: row,
          startCol: col,
          direction,
          endRow: calculateEndRow(row, col, word.length, direction),
          endCol: calculateEndCol(row, col, word.length, direction)
        });
        placed = true;
      }

      attempts++;
    }
  });

  // 3. Fill empty cells with random letters
  fillEmptyCells(grid);

  return { grid, placements };
}
```

**Visual Specifications:**

```
┌─────────────────────────────────────────────────────┐
│  Welche internationalen Wörter sind das?            │
├──────────────────────────┬──────────────────────────┤
│  Letter Grid             │  Words to Find           │
│                          │                          │
│  H O T E L Q W R T Y    │  ☑ HOTEL (found)        │
│  G I T A R R E P L K    │  ☐ EIS                  │
│  A N A N A S M J H G    │  ☐ GITARRE              │
│  R V C D E F G H I J    │  ☐ GARTEN               │
│  T B N M K L O P Q R    │  ☐ ANANAS               │
│  E X Y Z A B C D E F    │  ☐ HAMBURGER            │
│  N G H I J K L M N O    │  ☐ TAXI                 │
│                          │  ☐ FILM                 │
│                          │  ☐ PARK                 │
│  [Hint] (2 remaining)    │                          │
│                          │  Found: 1 / 9            │
└──────────────────────────┴──────────────────────────┘
```

**Component Styling:**

```tsx
// Grid Container
display: grid
grid-template-columns: repeat(12, 1fr)
gap: 4px
background: #F9FAFB
padding: 20px
border-radius: 12px
```

```tsx
// Letter Cell (Unselected)
width: 48px
height: 48px
background: #FFFFFF
border: 1px solid #E2E8F0
border-radius: 6px
display: flex
align-items: center
justify-content: center
font-size: 18px
font-weight: 600
cursor: pointer
user-select: none

hover:
  background: rgba(20, 184, 166, 0.1)
  border-color: #14B8A6
```

```tsx
// Letter Cell (Being Selected)
background: rgba(59, 130, 246, 0.2)
border: 2px solid #3B82F6
```

```tsx
// Letter Cell (Found Word)
// Each word gets unique color from palette
background: linear-gradient(135deg, #14B8A6, #0D9488) // Word 1
background: linear-gradient(135deg, #8B5CF6, #7C3AED) // Word 2
color: #FFFFFF
border: none
pointer-events: none
animation: pop-in 0.3s ease
```

**Interaction Pattern:**

```typescript
// Desktop
1. Click first letter of word
2. Click last letter of word
3. Validate selection against placements
4. If correct: highlight cells, mark word as found
5. If incorrect: flash red, clear selection

// Mobile
1. Touch and hold first letter
2. Swipe to last letter
3. Release to confirm
4. Validation same as desktop
```

**Hint System:**

```typescript
function provideHint(remainingWords: string[], placements: WordPlacement[]) {
  // Select random unfound word
  const word = remainingWords[Math.floor(Math.random() * remainingWords.length)];

  // Find placement
  const placement = placements.find(p => p.word === word);

  // Highlight first letter with pulse animation
  highlightCell(placement.startRow, placement.startCol);

  // Decrement hint counter
  hintsRemaining--;
}
```

**Scoring:**

```typescript
function scoreWordSearch(foundWords: Set<string>, totalWords: string[]): number {
  return Math.round((foundWords.size / totalWords.length) * 100);
}
```

---

### Universal Activity Player Framework

All activity types share a common player container:

**ActivityPlayer Component:**

```tsx
interface ActivityPlayerProps {
  assignmentId: string;
  activity: Activity;
  timeLimit?: number;  // Minutes
  onSubmit: (answers: any, score: number) => Promise<void>;
}

export function ActivityPlayer({ assignmentId, activity, timeLimit, onSubmit }: ActivityPlayerProps) {
  const [answers, setAnswers] = useState<any>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveProgress(assignmentId, answers, timeElapsed);
    }, 30000);

    return () => clearInterval(interval);
  }, [answers, timeElapsed]);

  // Render appropriate player based on type
  const renderActivityPlayer = () => {
    switch (activity.type) {
      case 'dragdroppicture':
        return <DragDropPicturePlayer activity={activity} onAnswersChange={setAnswers} />;
      case 'dragdroppicturegroup':
        return <DragDropPictureGroupPlayer activity={activity} onAnswersChange={setAnswers} />;
      case 'matchTheWords':
        return <MatchTheWordsPlayer activity={activity} onAnswersChange={setAnswers} />;
      case 'circle':
      case 'markwithx':
        return <CirclePlayer activity={activity} onAnswersChange={setAnswers} />;
      case 'puzzleFindWords':
        return <WordSearchPlayer activity={activity} onAnswersChange={setAnswers} />;
      default:
        return <UnsupportedActivityType />;
    }
  };

  return (
    <div className="activity-player">
      <ActivityHeader
        assignment={assignmentId}
        timer={timeLimit}
        onTimeExpired={handleAutoSubmit}
      />

      <div className="activity-content">
        {renderActivityPlayer()}
      </div>

      <ActivityFooter
        onSave={() => saveProgress(assignmentId, answers, timeElapsed)}
        onExit={handleExit}
        onSubmit={() => handleSubmit(answers)}
        submitDisabled={!isComplete(answers, activity)}
      />

      {showResults && (
        <ActivityResults
          score={calculateScore(answers, activity)}
          answers={answers}
          correctAnswers={getCorrectAnswers(activity)}
          onReview={() => setShowResults(false)}
          onExit={() => router.push('/assignments')}
        />
      )}
    </div>
  );
}
```

**Activity Header:**

```tsx
<header className="activity-header">
  {/* Navy border, teal gradient background (FlowBook style) */}
  <div className="activity-info">
    <BookTitle />
    <ActivityTypeBadge type={activity.type} />
  </div>

  {timeLimit && (
    <Timer
      duration={timeLimit * 60}
      onExpire={onTimeExpired}
      warningThreshold={300} // 5 minutes warning
    />
  )}

  {activity.type !== 'puzzleFindWords' && (
    <ProgressIndicator current={answeredCount} total={totalQuestions} />
  )}
</header>
```

**Activity Footer:**

```tsx
<footer className="activity-footer">
  <Button variant="outline" onClick={onSave}>
    <SaveIcon /> Save Progress
  </Button>

  <Button variant="outline" onClick={onExit}>
    <XIcon /> Exit
  </Button>

  <Button
    variant="primary"
    onClick={onSubmit}
    disabled={submitDisabled}
    className="submit-button"
  >
    <CheckIcon /> Submit
  </Button>
</footer>
```

---

### Activity Results Screen (Universal)

```tsx
interface ActivityResultsProps {
  score: number;
  answers: any;
  correctAnswers: any;
  onReview: () => void;
  onExit: () => void;
}

export function ActivityResults({ score, answers, correctAnswers, onReview, onExit }: ActivityResultsProps) {
  return (
    <div className="results-overlay">
      <div className="results-modal">
        <h1 className="results-title">🎉 Assignment Complete! 🎉</h1>

        <div className="score-display">
          <div className="score-number">{score}%</div>
          <StarRating score={score} />
        </div>

        <div className="stats-grid">
          <StatCard
            label="Correct"
            value={correctCount}
            color="green"
          />
          <StatCard
            label="Incorrect"
            value={incorrectCount}
            color="red"
          />
          <StatCard
            label="Time Spent"
            value={formatDuration(timeSpent)}
            color="blue"
          />
        </div>

        <div className="actions">
          <Button variant="outline" onClick={onReview}>
            Review Answers
          </Button>
          <Button variant="primary" onClick={onExit}>
            Back to Assignments
          </Button>
        </div>

        <Confetti active={score >= 90} />
      </div>
    </div>
  );
}
```

**Score-based Star Rating:**

```tsx
function StarRating({ score }: { score: number }) {
  const stars = score >= 90 ? 5 :
                score >= 80 ? 4 :
                score >= 70 ? 3 :
                score >= 60 ? 2 : 1;

  return (
    <div className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} filled={i < stars} />
      ))}
    </div>
  );
}
```

---

## 5. Data Visualization & Analytics

### 5.1 Overview & Philosophy

Dream LMS provides comprehensive analytics for **Teachers** (class-wide insights, student performance, error patterns) and **Students** (personal progress tracking, achievement visualization). All visualizations prioritize **clarity over complexity**, using the teal/cyan color palette with semantic colors for success/warning/error states. Charts are built with **Recharts** for consistency, performance, and responsive behavior.

**Design Principles:**

- **Data Density vs. Readability**: Balance information richness with visual clarity; avoid overwhelming users
- **Progressive Disclosure**: Show high-level metrics first, allow drill-down for details
- **Semantic Colors**: Green for improvement/success, red for decline/concern, teal for neutral metrics
- **Responsive Charts**: All charts adapt to viewport size, stacking or simplifying on mobile
- **Export-Ready**: All analytics views support PDF/Excel export with print-friendly layouts

**Key Metrics Hierarchy:**

1. **Primary Metrics** (large, prominent): Overall average score, completion rate, class average
2. **Secondary Metrics** (medium): Trend indicators (↑5% vs. last month), student count, assignment count
3. **Tertiary Metrics** (small, contextual): Time spent, streak days, activity type breakdowns

---

### 5.2 Color Palette for Data Visualization

**Chart Color System:**

```tsx
const CHART_COLORS = {
  // Primary data series (teal gradient)
  primary: '#14B8A6',        // Teal-500 (main line/bar color)
  primaryLight: '#5EEAD4',   // Teal-300 (area fill, gradients)
  primaryDark: '#0F766E',    // Teal-700 (hover states)

  // Secondary data series (cyan)
  secondary: '#06B6D4',      // Cyan-500
  secondaryLight: '#67E8F9', // Cyan-300

  // Semantic colors
  success: '#10B981',        // Green-500 (improvement, correct answers)
  successLight: '#6EE7B7',   // Green-300 (area fill)
  warning: '#F59E0B',        // Amber-500 (needs attention, medium performance)
  warningLight: '#FCD34D',   // Amber-300
  error: '#EF4444',          // Red-500 (decline, errors, below threshold)
  errorLight: '#FCA5A5',     // Red-300

  // Multi-series palette (for activity type breakdowns)
  series: [
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Green
  ],

  // Neutral tones (dark mode)
  gridDark: '#334155',       // Slate-700 (axis lines)
  textDark: '#CBD5E1',       // Slate-300 (labels)
  backgroundDark: '#1E293B', // Slate-800 (chart background)

  // Neutral tones (light mode)
  gridLight: '#E2E8F0',      // Slate-200
  textLight: '#475569',      // Slate-600
  backgroundLight: '#F8FAFC',// Slate-50
};
```

**Color Usage Rules:**

- **Single metric over time**: Primary teal gradient
- **Comparison (2 series)**: Primary teal + Secondary cyan
- **Multiple categories**: Use `series` array, cycling through colors
- **Performance thresholds**: 90%+ = success green, 70-89% = primary teal, below 70% = warning amber
- **Trend indicators**: Positive = success green, negative = error red

---

### 5.3 Recharts Configuration & Base Components

**Global Recharts Theme:**

```tsx
// src/components/analytics/ChartTheme.tsx
import { useTheme } from '@/hooks/useTheme';

export function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return {
    colors: CHART_COLORS,

    // Typography
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',

    // Grid and axes
    gridStroke: isDark ? CHART_COLORS.gridDark : CHART_COLORS.gridLight,
    axisColor: isDark ? CHART_COLORS.textDark : CHART_COLORS.textLight,

    // Tooltip styling
    tooltipStyle: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      padding: '12px',
    },

    // Chart background
    chartBackground: isDark ? CHART_COLORS.backgroundDark : CHART_COLORS.backgroundLight,
  };
}
```

**Base Chart Container:**

```tsx
// src/components/analytics/ChartContainer.tsx
interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode; // Export button, time period selector
  className?: string;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  actions,
  className
}: ChartContainerProps) {
  return (
    <div className={cn(
      'rounded-lg border border-slate-200 dark:border-slate-700',
      'bg-white dark:bg-slate-800 p-6',
      'shadow-sm',
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      {/* Chart content */}
      <div className="w-full h-[300px] sm:h-[400px]">
        {children}
      </div>
    </div>
  );
}
```

**Responsive Container Wrapper:**

```tsx
// All charts use ResponsiveContainer for fluid sizing
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={data}>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
```

---

### 5.4 Teacher Analytics: Individual Student Performance

**Component:** `StudentPerformanceDashboard`

**Location:** `/src/pages/teacher/StudentAnalytics.tsx`

**Layout Structure:**

```
┌─────────────────────────────────────────────────┐
│ Student Header (photo, name, overall stats)    │
├─────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────────────┐│
│ │ Overall Stats   │ │ Performance Trend Chart ││
│ │ (cards)         │ │ (line chart)            ││
│ └─────────────────┘ └─────────────────────────┘│
├─────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────────────┐│
│ │ Activity Type   │ │ Recent Assignments      ││
│ │ Breakdown (bar) │ │ (table)                 ││
│ └─────────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**Data Structure:**

```tsx
interface StudentAnalytics {
  student: {
    id: string;
    name: string;
    avatar_url?: string;
    grade_level: string;
  };
  overall: {
    average_score: number;         // 0-100
    total_completed: number;
    total_assigned: number;
    current_streak: number;        // consecutive days
    total_time_minutes: number;
  };
  performance_trend: {
    date: string;                  // ISO date
    score: number;                 // 0-100
    assignment_name: string;
  }[];
  activity_breakdown: {
    activity_type: string;         // "dragdroppicture", "matchTheWords", etc.
    average_score: number;
    count: number;
  }[];
  recent_assignments: {
    id: string;
    name: string;
    score: number;
    completed_at: string;
    time_spent_minutes: number;
  }[];
  time_analytics: {
    average_per_assignment: number; // minutes
    total_this_week: number;
    total_this_month: number;
  };
}
```

**API Endpoint:**

```typescript
GET /api/students/{student_id}/analytics?period=last_30_days

Response: StudentAnalytics
```

**Chart 1: Performance Trend (Line Chart)**

```tsx
<ChartContainer
  title="Score Trends"
  subtitle="Performance over selected time period"
  actions={<TimePeriodSelector />}
>
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={performanceTrend}>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke={chartTheme.gridStroke}
      />
      <XAxis
        dataKey="date"
        tickFormatter={(date) => format(new Date(date), 'MMM d')}
        stroke={chartTheme.axisColor}
        style={{ fontSize: 12 }}
      />
      <YAxis
        domain={[0, 100]}
        stroke={chartTheme.axisColor}
        style={{ fontSize: 12 }}
        label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
      />
      <Tooltip
        contentStyle={chartTheme.tooltipStyle}
        labelFormatter={(date) => format(new Date(date), 'PPP')}
        formatter={(value: number, name: string, props: any) => [
          `${value}%`,
          props.payload.assignment_name
        ]}
      />
      <Line
        type="monotone"
        dataKey="score"
        stroke={CHART_COLORS.primary}
        strokeWidth={2}
        dot={{ fill: CHART_COLORS.primary, r: 4 }}
        activeDot={{ r: 6 }}
      />

      {/* Reference line at 70% (passing threshold) */}
      <ReferenceLine
        y={70}
        stroke={CHART_COLORS.warning}
        strokeDasharray="3 3"
        label={{ value: 'Passing', position: 'right', fill: CHART_COLORS.warning }}
      />
    </LineChart>
  </ResponsiveContainer>
</ChartContainer>
```

**Chart 2: Activity Type Breakdown (Bar Chart)**

```tsx
<ChartContainer
  title="Performance by Activity Type"
  subtitle="Average scores across different activity types"
>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={activityBreakdown}
      layout="vertical"
      margin={{ left: 120 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
      <XAxis
        type="number"
        domain={[0, 100]}
        stroke={chartTheme.axisColor}
        label={{ value: 'Average Score (%)', position: 'insideBottom', offset: -5 }}
      />
      <YAxis
        type="category"
        dataKey="activity_type"
        stroke={chartTheme.axisColor}
        width={110}
        tickFormatter={(type) => formatActivityType(type)}
      />
      <Tooltip
        contentStyle={chartTheme.tooltipStyle}
        formatter={(value: number, name: string, props: any) => [
          `${value}% (${props.payload.count} activities)`,
          'Average Score'
        ]}
      />
      <Bar
        dataKey="average_score"
        fill={CHART_COLORS.primary}
        radius={[0, 4, 4, 0]}
      >
        {/* Color bars based on performance */}
        {activityBreakdown.map((entry, index) => (
          <Cell
            key={index}
            fill={
              entry.average_score >= 90 ? CHART_COLORS.success :
              entry.average_score >= 70 ? CHART_COLORS.primary :
              CHART_COLORS.warning
            }
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</ChartContainer>
```

**Utility: Format Activity Type Names:**

```tsx
function formatActivityType(type: string): string {
  const names: Record<string, string> = {
    'dragdroppicture': 'Drag & Drop',
    'dragdroppicturegroup': 'Categorization',
    'matchTheWords': 'Word Matching',
    'circle': 'Select Areas',
    'markwithx': 'Mark with X',
    'puzzleFindWords': 'Word Search',
  };
  return names[type] || type;
}
```

**Overall Stats Cards:**

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <StatCard
    label="Overall Average"
    value={`${overall.average_score}%`}
    icon={<TrendingUp />}
    trend={calculateTrend(performanceTrend)}
  />
  <StatCard
    label="Completed"
    value={`${overall.total_completed}/${overall.total_assigned}`}
    icon={<CheckCircle />}
  />
  <StatCard
    label="Current Streak"
    value={`${overall.current_streak} days`}
    icon={<Flame />}
  />
  <StatCard
    label="Study Time"
    value={formatMinutes(overall.total_time_minutes)}
    icon={<Clock />}
  />
</div>
```

---

### 5.5 Teacher Analytics: Class-Wide Performance

**Component:** `ClassAnalyticsDashboard`

**Location:** `/src/pages/teacher/ClassAnalytics.tsx`

**Data Structure:**

```tsx
interface ClassAnalytics {
  class: {
    id: string;
    name: string;
    student_count: number;
  };
  overview: {
    average_score: number;
    completion_rate: number;       // 0-100
    total_assignments: number;
    active_students: number;       // students with activity in period
  };
  score_distribution: {
    range: string;                 // "0-59", "60-69", "70-79", "80-89", "90-100"
    count: number;
    percentage: number;
  }[];
  leaderboard: {
    student_id: string;
    student_name: string;
    avatar_url?: string;
    average_score: number;
    rank: number;
  }[];
  struggling_students: {
    student_id: string;
    student_name: string;
    average_score: number;
    past_due_count: number;
    reason: string;                // "Low score" | "Past due assignments"
  }[];
  assignment_performance: {
    assignment_id: string;
    assignment_name: string;
    average_score: number;
    completion_rate: number;
    average_time_minutes: number;
  }[];
  activity_type_performance: {
    activity_type: string;
    average_score: number;
  }[];
  trend_comparison: {
    metric: string;
    current_value: number;
    previous_value: number;
    change_percentage: number;     // can be negative
  }[];
}
```

**API Endpoint:**

```typescript
GET /api/classes/{class_id}/analytics?period=this_month

Response: ClassAnalytics
```

**Chart 1: Score Distribution (Histogram)**

```tsx
<ChartContainer
  title="Class Score Distribution"
  subtitle="How students are performing across score ranges"
>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={scoreDistribution}>
      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
      <XAxis
        dataKey="range"
        stroke={chartTheme.axisColor}
        label={{ value: 'Score Range', position: 'insideBottom', offset: -5 }}
      />
      <YAxis
        stroke={chartTheme.axisColor}
        label={{ value: 'Number of Students', angle: -90, position: 'insideLeft' }}
      />
      <Tooltip
        contentStyle={chartTheme.tooltipStyle}
        formatter={(value: number, name: string, props: any) => [
          `${value} students (${props.payload.percentage}%)`,
          'Count'
        ]}
      />
      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
        {scoreDistribution.map((entry, index) => (
          <Cell
            key={index}
            fill={
              entry.range.startsWith('9') ? CHART_COLORS.success :
              entry.range.startsWith('8') ? CHART_COLORS.primary :
              entry.range.startsWith('7') ? CHART_COLORS.secondary :
              entry.range.startsWith('6') ? CHART_COLORS.warning :
              CHART_COLORS.error
            }
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</ChartContainer>
```

**Chart 2: Activity Type Performance (Radar Chart)**

```tsx
<ChartContainer
  title="Activity Type Strengths"
  subtitle="Class performance across different activity types"
>
  <ResponsiveContainer width="100%" height="100%">
    <RadarChart data={activityTypePerformance}>
      <PolarGrid stroke={chartTheme.gridStroke} />
      <PolarAngleAxis
        dataKey="activity_type"
        tick={{ fill: chartTheme.axisColor, fontSize: 11 }}
        tickFormatter={(type) => formatActivityType(type)}
      />
      <PolarRadiusAxis
        angle={90}
        domain={[0, 100]}
        tick={{ fill: chartTheme.axisColor }}
      />
      <Radar
        name="Average Score"
        dataKey="average_score"
        stroke={CHART_COLORS.primary}
        fill={CHART_COLORS.primary}
        fillOpacity={0.3}
      />
      <Tooltip
        contentStyle={chartTheme.tooltipStyle}
        formatter={(value: number) => [`${value}%`, 'Class Average']}
      />
    </RadarChart>
  </ResponsiveContainer>
</ChartContainer>
```

**Leaderboard Component:**

```tsx
<ChartContainer title="Top Performers" subtitle="Highest average scores">
  <div className="space-y-3">
    {leaderboard.map((student, index) => (
      <div
        key={student.student_id}
        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
      >
        {/* Rank badge */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
          index === 0 && "bg-amber-400 text-amber-900",
          index === 1 && "bg-slate-300 text-slate-700",
          index === 2 && "bg-orange-300 text-orange-900",
          index > 2 && "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
        )}>
          {student.rank}
        </div>

        {/* Avatar */}
        <Avatar className="w-10 h-10">
          <AvatarImage src={student.avatar_url} />
          <AvatarFallback>{student.student_name[0]}</AvatarFallback>
        </Avatar>

        {/* Name */}
        <span className="flex-1 font-medium text-slate-900 dark:text-slate-100">
          {student.student_name}
        </span>

        {/* Score */}
        <span className="font-bold text-lg text-teal-600 dark:text-teal-400">
          {student.average_score}%
        </span>
      </div>
    ))}
  </div>
</ChartContainer>
```

**Struggling Students Alert:**

```tsx
{strugglingStudents.length > 0 && (
  <ChartContainer
    title="Students Needing Support"
    subtitle="Students with low performance or past due assignments"
  >
    <div className="space-y-3">
      {strugglingStudents.map((student) => (
        <div
          key={student.student_id}
          className="flex items-center gap-3 p-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {student.student_name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {student.reason} · Average: {student.average_score}%
              {student.past_due_count > 0 && ` · ${student.past_due_count} past due`}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/teacher/students/${student.student_id}`}>
              View Details
            </Link>
          </Button>
        </div>
      ))}
    </div>
  </ChartContainer>
)}
```

**Trend Comparison Cards:**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  {trendComparison.map((trend) => (
    <TrendCard
      key={trend.metric}
      label={trend.metric}
      value={formatMetricValue(trend.metric, trend.current_value)}
      change={trend.change_percentage}
      previousValue={formatMetricValue(trend.metric, trend.previous_value)}
    />
  ))}
</div>

function TrendCard({ label, value, change, previousValue }) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <div className="flex items-center gap-1 mt-2">
        {isPositive && <TrendingUp className="w-4 h-4 text-green-500" />}
        {isNegative && <TrendingDown className="w-4 h-4 text-red-500" />}
        <span className={cn(
          "text-sm font-medium",
          isPositive && "text-green-600 dark:text-green-400",
          isNegative && "text-red-600 dark:text-red-400",
          !isPositive && !isNegative && "text-slate-500"
        )}>
          {change > 0 && '+'}{change.toFixed(1)}% vs. previous period
        </span>
      </div>
    </div>
  );
}
```

---

### 5.6 Teacher Analytics: Assignment-Specific Analytics

**Component:** `AssignmentAnalyticsDashboard`

**Location:** `/src/pages/teacher/AssignmentAnalytics.tsx`

**Data Structure:**

```tsx
interface AssignmentAnalytics {
  assignment: {
    id: string;
    name: string;
    activity_type: string;
    total_assigned: number;
  };
  completion_stats: {
    completed_count: number;
    in_progress_count: number;
    not_started_count: number;
    completion_rate: number;
  };
  score_stats: {
    average_score: number;
    median_score: number;
    highest_score: number;
    lowest_score: number;
  };
  time_stats: {
    average_time_minutes: number;
    median_time_minutes: number;
    fastest_time_minutes: number;
    slowest_time_minutes: number;
  };
  score_timeline: {
    completed_at: string;
    student_name: string;
    score: number;
  }[];
  question_analytics: {
    question_number: number;
    question_text: string;
    correct_count: number;
    incorrect_count: number;
    correct_rate: number;
    common_errors: {
      incorrect_answer: string;
      count: number;
    }[];
  }[];
}
```

**API Endpoint:**

```typescript
GET /api/assignments/{assignment_id}/detailed-results

Response: AssignmentAnalytics
```

**Chart 1: Completion Status (Pie Chart)**

```tsx
<ChartContainer title="Completion Status" subtitle="Assignment progress breakdown">
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={[
          { name: 'Completed', value: completionStats.completed_count, fill: CHART_COLORS.success },
          { name: 'In Progress', value: completionStats.in_progress_count, fill: CHART_COLORS.warning },
          { name: 'Not Started', value: completionStats.not_started_count, fill: CHART_COLORS.error },
        ]}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={100}
        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
      >
      </Pie>
      <Tooltip
        contentStyle={chartTheme.tooltipStyle}
        formatter={(value: number, name: string) => [`${value} students`, name]}
      />
    </PieChart>
  </ResponsiveContainer>
</ChartContainer>
```

**Chart 2: Score Timeline (Scatter Plot)**

```tsx
<ChartContainer
  title="Score Timeline"
  subtitle="When students completed and their scores"
>
  <ResponsiveContainer width="100%" height="100%">
    <ScatterChart>
      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
      <XAxis
        dataKey="completed_at"
        type="category"
        tickFormatter={(date) => format(new Date(date), 'MMM d')}
        stroke={chartTheme.axisColor}
      />
      <YAxis
        dataKey="score"
        domain={[0, 100]}
        stroke={chartTheme.axisColor}
        label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
      />
      <Tooltip
        contentStyle={chartTheme.tooltipStyle}
        cursor={{ strokeDasharray: '3 3' }}
        formatter={(value: number, name: string, props: any) => [
          `${value}%`,
          props.payload.student_name
        ]}
      />
      <Scatter
        data={scoreTimeline}
        fill={CHART_COLORS.primary}
      />

      {/* Reference line at average */}
      <ReferenceLine
        y={scoreStats.average_score}
        stroke={CHART_COLORS.secondary}
        strokeDasharray="3 3"
        label={{ value: 'Average', position: 'right' }}
      />
    </ScatterChart>
  </ResponsiveContainer>
</ChartContainer>
```

**Question Analytics Heatmap:**

```tsx
<ChartContainer
  title="Question Difficulty Analysis"
  subtitle="Which questions students struggled with most"
>
  <div className="space-y-3 max-h-[400px] overflow-y-auto">
    {questionAnalytics
      .sort((a, b) => a.correct_rate - b.correct_rate) // Hardest first
      .map((question) => (
        <div
          key={question.question_number}
          className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
        >
          {/* Question header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Question {question.question_number}
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                {question.question_text}
              </p>
            </div>
            <span className={cn(
              "text-lg font-bold ml-4",
              question.correct_rate >= 80 ? "text-green-600" :
              question.correct_rate >= 60 ? "text-teal-600" :
              "text-red-600"
            )}>
              {question.correct_rate}%
            </span>
          </div>

          {/* Correct/Incorrect bar */}
          <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="bg-green-500"
              style={{ width: `${question.correct_rate}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${100 - question.correct_rate}%` }}
            />
          </div>

          {/* Common errors */}
          {question.common_errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Common Incorrect Answers:
              </p>
              <div className="space-y-1">
                {question.common_errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      "{error.incorrect_answer}"
                    </span>
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {error.count} students
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
  </div>
</ChartContainer>
```

---

### 5.7 Student Analytics: Personal Progress Tracking

**Component:** `StudentProgressDashboard`

**Location:** `/src/pages/student/Progress.tsx`

**Data Structure:**

```tsx
interface StudentProgress {
  overall: {
    total_completed: number;
    average_score: number;
    current_streak: number;
    total_study_time_minutes: number;
  };
  progress_timeline: {
    date: string;
    score: number;
    assignment_name: string;
  }[];
  activity_breakdown: {
    activity_type: string;
    average_score: number;
    count: number;
  }[];
  recent_assignments: {
    id: string;
    name: string;
    score: number;
    completed_at: string;
  }[];
  improvement_indicator: {
    trend: 'improving' | 'stable' | 'declining';
    recent_average: number;      // last 5 assignments
    overall_average: number;
    message: string;             // Encouraging message
  };
  achievements: {
    badge_id: string;
    badge_name: string;
    earned_at: string;
    icon: string;
  }[];
}
```

**API Endpoint:**

```typescript
GET /api/students/me/progress?period=last_30_days

Response: StudentProgress
```

**Chart 1: Progress Timeline (Area Chart with Gradient)**

```tsx
<ChartContainer
  title="My Progress"
  subtitle="Your score trends over the last 30 days"
>
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={progressTimeline}>
      <defs>
        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
        </linearGradient>
      </defs>

      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
      <XAxis
        dataKey="date"
        tickFormatter={(date) => format(new Date(date), 'MMM d')}
        stroke={chartTheme.axisColor}
      />
      <YAxis
        domain={[0, 100]}
        stroke={chartTheme.axisColor}
        label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
      />
      <Tooltip
        contentStyle={chartTheme.tooltipStyle}
        labelFormatter={(date) => format(new Date(date), 'PPP')}
        formatter={(value: number, name: string, props: any) => [
          `${value}%`,
          props.payload.assignment_name
        ]}
      />

      <Area
        type="monotone"
        dataKey="score"
        stroke={CHART_COLORS.primary}
        strokeWidth={2}
        fill="url(#scoreGradient)"
      />
    </AreaChart>
  </ResponsiveContainer>
</ChartContainer>
```

**Chart 2: Activity Type Breakdown (Radial Bar Chart)**

```tsx
<ChartContainer
  title="My Strengths"
  subtitle="Performance across activity types"
>
  <ResponsiveContainer width="100%" height="100%">
    <RadialBarChart
      innerRadius="10%"
      outerRadius="90%"
      data={activityBreakdown.map((item, idx) => ({
        ...item,
        fill: CHART_COLORS.series[idx % CHART_COLORS.series.length]
      }))}
      startAngle={90}
      endAngle={-270}
    >
      <RadialBar
        minAngle={15}
        background
        clockWise
        dataKey="average_score"
        label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
      />
      <Legend
        iconSize={10}
        layout="vertical"
        verticalAlign="middle"
        align="right"
        formatter={(value, entry) => `${formatActivityType(entry.payload.activity_type)}: ${entry.payload.average_score}%`}
      />
      <Tooltip
        contentStyle={chartTheme.tooltipStyle}
        formatter={(value: number, name: string, props: any) => [
          `${value}% (${props.payload.count} completed)`,
          formatActivityType(props.payload.activity_type)
        ]}
      />
    </RadialBarChart>
  </ResponsiveContainer>
</ChartContainer>
```

**Improvement Indicator Card:**

```tsx
<div className={cn(
  "p-6 rounded-lg border-2",
  improvementIndicator.trend === 'improving' && "border-green-500 bg-green-50 dark:bg-green-900/20",
  improvementIndicator.trend === 'stable' && "border-teal-500 bg-teal-50 dark:bg-teal-900/20",
  improvementIndicator.trend === 'declining' && "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
)}>
  <div className="flex items-center gap-3 mb-3">
    {improvementIndicator.trend === 'improving' && <TrendingUp className="w-8 h-8 text-green-600" />}
    {improvementIndicator.trend === 'stable' && <Minus className="w-8 h-8 text-teal-600" />}
    {improvementIndicator.trend === 'declining' && <TrendingDown className="w-8 h-8 text-amber-600" />}

    <div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {improvementIndicator.trend === 'improving' && 'Great Progress!'}
        {improvementIndicator.trend === 'stable' && 'Steady Performance'}
        {improvementIndicator.trend === 'declining' && 'Keep Trying!'}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {improvementIndicator.message}
      </p>
    </div>
  </div>

  <div className="flex gap-4 mt-4">
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Recent Average (last 5)</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {improvementIndicator.recent_average}%
      </p>
    </div>
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Overall Average</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {improvementIndicator.overall_average}%
      </p>
    </div>
  </div>
</div>
```

**Achievements Display:**

```tsx
<ChartContainer title="My Achievements" subtitle="Badges you've earned">
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
    {achievements.map((badge) => (
      <div
        key={badge.badge_id}
        className="flex flex-col items-center p-4 rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-700"
      >
        <div className="text-4xl mb-2">{badge.icon}</div>
        <p className="text-sm font-medium text-center text-slate-900 dark:text-slate-100">
          {badge.badge_name}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {format(new Date(badge.earned_at), 'MMM d, yyyy')}
        </p>
      </div>
    ))}
  </div>
</ChartContainer>
```

---

### 5.8 Time Period Selector Component

**Shared component for filtering analytics by time period:**

```tsx
// src/components/analytics/TimePeriodSelector.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TimePeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
}

export function TimePeriodSelector({ value, onChange }: TimePeriodSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="last_7_days">Last 7 Days</SelectItem>
        <SelectItem value="last_30_days">Last 30 Days</SelectItem>
        <SelectItem value="last_3_months">Last 3 Months</SelectItem>
        <SelectItem value="this_semester">This Semester</SelectItem>
        <SelectItem value="this_year">This Year</SelectItem>
        <SelectItem value="all_time">All Time</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

**Usage with API:**

```tsx
const [period, setPeriod] = useState('last_30_days');

const { data: analytics } = useQuery({
  queryKey: ['student-analytics', studentId, period],
  queryFn: () => fetchStudentAnalytics(studentId, period),
});
```

---

### 5.9 Export Functionality

**PDF Export Button:**

```tsx
// src/components/analytics/ExportButton.tsx
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  analyticsType: 'student' | 'class' | 'assignment';
  id: string;
  format: 'pdf' | 'excel';
}

export function ExportButton({ analyticsType, id, format }: ExportButtonProps) {
  const handleExport = async () => {
    const endpoint = `/api/analytics/export/${analyticsType}/${id}?format=${format}`;

    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analyticsType}-report-${id}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Export {format.toUpperCase()}
    </Button>
  );
}
```

**Backend Endpoints:**

```python
# Backend endpoints for export (Python/FastAPI)
@router.get("/analytics/export/student/{student_id}")
async def export_student_analytics(
    student_id: str,
    format: Literal["pdf", "excel"],
    period: str = "last_30_days",
    current_user: User = Depends(get_current_user)
):
    # Generate PDF or Excel report
    if format == "pdf":
        return generate_student_pdf_report(student_id, period)
    else:
        return generate_student_excel_report(student_id, period)
```

---

### 5.10 Responsive Behavior

**Breakpoint Adaptations:**

1. **Desktop (1024px+):**
   - Charts side-by-side in 2-column grid
   - Full height charts (400px)
   - All tooltips and legends visible

2. **Tablet (768-1023px):**
   - Charts stack in single column
   - Chart height reduced to 350px
   - Legends move below charts

3. **Mobile (320-767px):**
   - All charts full-width stacked
   - Chart height 300px
   - Simplified tooltips (fewer details)
   - Hide gridlines on very small screens
   - Use horizontal scrolling for wide tables

**Responsive Container Example:**

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <ChartContainer title="Performance Trend">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        {/* Chart elements */}
      </LineChart>
    </ResponsiveContainer>
  </ChartContainer>

  <ChartContainer title="Activity Breakdown">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        {/* Chart elements */}
      </ChartContainer>
    </ResponsiveContainer>
  </ChartContainer>
</div>
```

---

### 5.11 Loading States & Empty States

**Loading Skeleton for Charts:**

```tsx
// src/components/analytics/ChartSkeleton.tsx
export function ChartSkeleton() {
  return (
    <div className="w-full h-[400px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      {/* Header skeleton */}
      <div className="mb-4">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Chart area skeleton */}
      <div className="w-full h-[300px] flex items-end justify-around gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton
            key={i}
            className="w-full"
            style={{ height: `${Math.random() * 200 + 50}px` }}
          />
        ))}
      </div>
    </div>
  );
}
```

**Empty State for No Data:**

```tsx
// src/components/analytics/EmptyAnalytics.tsx
import { BarChart3, AlertCircle } from 'lucide-react';

export function EmptyAnalytics({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
      <BarChart3 className="w-16 h-16 text-slate-400 mb-4" />
      <p className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
        No Data Yet
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-500 text-center max-w-md">
        {message}
      </p>
    </div>
  );
}

// Usage
{analytics.progress_timeline.length === 0 ? (
  <EmptyAnalytics message="Complete some assignments to see your progress chart" />
) : (
  <ProgressChart data={analytics.progress_timeline} />
)}
```

---

**End of Section 5**

---

## 6. Responsive Design & Breakpoints

### 6.1 Breakpoint System

Dream LMS uses Tailwind CSS's default breakpoint system with mobile-first approach. All designs start with mobile (320px) and progressively enhance for larger screens.

**Breakpoint Definitions:**

```tsx
const BREAKPOINTS = {
  mobile: '320px',    // Mobile devices (default, no prefix)
  sm: '640px',        // Large phones, small tablets
  md: '768px',        // Tablets
  lg: '1024px',       // Laptops, small desktops
  xl: '1280px',       // Desktops
  '2xl': '1536px',    // Large desktops
};
```

**Key Target Devices:**

1. **Mobile (320-767px)**: iPhone SE, iPhone 12/13/14, Android phones
2. **Tablet (768-1023px)**: iPad, Android tablets, small laptops
3. **Desktop (1024px+)**: Laptops, desktop monitors, large displays

**Design Philosophy:**

- **Mobile-first**: Base styles target mobile, use `md:` and `lg:` for larger screens
- **Touch-friendly**: Minimum tap targets of 44x44px on mobile
- **Content priority**: Hide secondary UI elements on mobile, reveal on larger screens
- **Performance**: Defer loading heavy components (charts, images) on mobile

---

### 6.2 Layout Patterns by Breakpoint

**6.2.1 Navigation & Sidebar**

```tsx
// Mobile (< 768px): Bottom navigation bar
<nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around px-4 md:hidden">
  <NavItem icon={<Home />} label="Home" href="/dashboard" />
  <NavItem icon={<BookOpen />} label="Assignments" href="/assignments" />
  <NavItem icon={<User />} label="Profile" href="/profile" />
</nav>

// Tablet/Desktop (>= 768px): Sidebar navigation
<aside className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:h-screen md:w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
  <div className="p-6">
    <Logo />
  </div>
  <nav className="flex-1 px-4 py-6 space-y-2">
    <SidebarItem icon={<Home />} label="Dashboard" href="/dashboard" />
    <SidebarItem icon={<BookOpen />} label="Assignments" href="/assignments" />
    {/* ... */}
  </nav>
</aside>

// Main content area adjusts for sidebar
<main className="pb-20 md:pb-0 md:ml-64 p-4 md:p-6 lg:p-8">
  {children}
</main>
```

**6.2.2 Dashboard Cards Grid**

```tsx
// Mobile: Single column
// Tablet: 2 columns
// Desktop: 3-4 columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
  <StatCard label="Total Students" value="245" />
  <StatCard label="Active Assignments" value="12" />
  <StatCard label="Avg. Completion" value="87%" />
  <StatCard label="This Week" value="34" />
</div>
```

**6.2.3 Data Tables**

```tsx
// Mobile: Card list (vertical stack)
// Tablet+: Traditional table layout

function StudentTable({ students }: { students: Student[] }) {
  return (
    <>
      {/* Mobile view: Cards */}
      <div className="md:hidden space-y-3">
        {students.map((student) => (
          <div key={student.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={student.avatar_url} />
                  <AvatarFallback>{student.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{student.name}</p>
                  <p className="text-sm text-slate-500">{student.email}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Grade:</span>
                <span className="ml-1 text-slate-900 dark:text-slate-100">{student.grade_level}</span>
              </div>
              <div>
                <span className="text-slate-500">Avg Score:</span>
                <span className="ml-1 font-medium text-teal-600">{student.average_score}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tablet+ view: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Student</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Grade</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Avg Score</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={student.avatar_url} />
                      <AvatarFallback>{student.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{student.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{student.email}</td>
                <td className="px-4 py-3">{student.grade_level}</td>
                <td className="px-4 py-3 font-medium text-teal-600">{student.average_score}%</td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm">View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

**6.2.4 Forms and Dialogs**

```tsx
// Mobile: Full-screen modal
// Desktop: Centered dialog with max-width

function AssignmentDialog({ open, onClose }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="
        w-full h-full max-w-none max-h-none m-0 rounded-none
        md:w-auto md:h-auto md:max-w-2xl md:max-h-[90vh] md:rounded-lg md:m-auto
      ">
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Form content */}
          <form className="space-y-6">
            <FormField label="Assignment Name">
              <Input className="w-full" />
            </FormField>

            {/* Mobile: Stack form fields */}
            {/* Desktop: 2-column layout for some fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Due Date">
                <DatePicker />
              </FormField>
              <FormField label="Time Limit">
                <Select />
              </FormField>
            </div>
          </form>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button className="w-full sm:w-auto">
            Create Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 6.3 Activity Player Responsive Behavior

**6.3.1 Canvas Scaling**

Activity backgrounds (page images) scale proportionally to fit viewport while maintaining aspect ratio.

```tsx
function ActivityCanvas({ backgroundUrl, width, height }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;

      // Calculate scale to fit container
      const scaleX = containerWidth / width;
      const scaleY = containerHeight / height;
      const newScale = Math.min(scaleX, scaleY, 1); // Never scale up, only down

      setScale(newScale);
    }

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [width, height]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative"
      >
        <img src={backgroundUrl} alt="Activity background" className="w-full h-full" />
        {/* Activity elements positioned absolutely using coords */}
      </div>
    </div>
  );
}
```

**6.3.2 Touch vs. Mouse Interactions**

```tsx
// Detect device type
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Drag & Drop: Use react-dnd for mouse, custom touch handlers for mobile
function DraggableWord({ word }: { word: string }) {
  if (isTouchDevice) {
    return (
      <div
        className="px-4 py-3 rounded-lg bg-teal-100 dark:bg-teal-900/30 border-2 border-teal-500 text-sm font-medium cursor-move active:scale-95 transition-transform"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {word}
      </div>
    );
  }

  // Desktop: Use react-dnd
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'word',
    item: { word },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={cn(
        "px-4 py-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 border-2 border-teal-500 text-sm font-medium cursor-move hover:bg-teal-200 dark:hover:bg-teal-800/40 transition-colors",
        isDragging && "opacity-50"
      )}
    >
      {word}
    </div>
  );
}
```

**6.3.3 Activity Player Layout**

```tsx
// Mobile: Vertical stack (background above, controls below)
// Desktop: Optimized layout with side panels

function ActivityPlayer({ activity }: { activity: Activity }) {
  return (
    <div className="h-screen flex flex-col lg:flex-row">
      {/* Activity canvas */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 lg:h-16 px-4 lg:px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h1 className="text-base lg:text-lg font-semibold truncate">{activity.headerText}</h1>
          <Timer initialTime={activity.timeLimit} />
        </header>

        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">
          <ActivityCanvas backgroundUrl={activity.backgroundUrl} width={800} height={600} />
        </div>

        {/* Footer - Mobile only */}
        <footer className="lg:hidden h-16 px-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <Button variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button size="sm">
            Submit
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </footer>
      </div>

      {/* Right sidebar - Desktop only */}
      <aside className="hidden lg:flex lg:flex-col lg:w-80 xl:w-96 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {/* Instructions, word bank, etc. */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Instructions</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">
            {activity.instructions}
          </p>

          {activity.type === 'dragdroppicture' && (
            <>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Word Bank</h3>
              <div className="flex flex-wrap gap-2">
                {activity.words.map((word) => (
                  <DraggableWord key={word} word={word} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <Button variant="outline" className="flex-1">
            Back
          </Button>
          <Button className="flex-1">
            Submit
          </Button>
        </div>
      </aside>
    </div>
  );
}
```

---

### 6.4 Typography Scaling

**Font Size Scale by Breakpoint:**

```tsx
// Headings scale up on larger screens
const HEADING_SIZES = {
  h1: 'text-2xl md:text-3xl lg:text-4xl font-bold',
  h2: 'text-xl md:text-2xl lg:text-3xl font-semibold',
  h3: 'text-lg md:text-xl lg:text-2xl font-semibold',
  h4: 'text-base md:text-lg font-medium',
  h5: 'text-sm md:text-base font-medium',
  h6: 'text-sm font-medium',
};

// Body text
const BODY_SIZES = {
  large: 'text-base md:text-lg',
  base: 'text-sm md:text-base',
  small: 'text-xs md:text-sm',
  tiny: 'text-xs',
};
```

**Usage:**

```tsx
<h1 className={HEADING_SIZES.h1}>Dashboard</h1>
<p className={BODY_SIZES.base}>Welcome to Dream LMS</p>
```

---

### 6.5 Spacing & Padding

**Container Padding:**

```tsx
// Tighter padding on mobile, more generous on desktop
<div className="px-4 md:px-6 lg:px-8 py-4 md:py-6">
  {/* Content */}
</div>
```

**Card Spacing:**

```tsx
// Cards
<div className="p-4 md:p-6 rounded-lg border">
  {/* Card content */}
</div>

// Gap between grid items
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {/* Grid items */}
</div>
```

---

### 6.6 Image & Media Handling

**Responsive Images:**

```tsx
// Book covers, avatars
<img
  src={imageUrl}
  alt={alt}
  className="w-full h-auto object-cover rounded-lg"
  loading="lazy"
/>

// Fixed aspect ratio containers
<div className="aspect-[3/4] w-full overflow-hidden rounded-lg">
  <img src={bookCover} alt={bookTitle} className="w-full h-full object-cover" />
</div>
```

**Responsive Video/Audio Players:**

```tsx
// Audio player in activity
<audio
  controls
  className="w-full max-w-md mx-auto"
  src={audioUrl}
/>
```

---

### 6.7 Button Sizing

**Touch Targets:**

Minimum 44x44px on mobile for accessibility.

```tsx
// Mobile: Larger, full-width buttons
// Desktop: Inline, appropriately sized

<Button className="w-full md:w-auto h-11 md:h-10">
  Save Changes
</Button>

// Icon buttons maintain minimum touch target
<Button variant="ghost" size="icon" className="w-11 h-11 md:w-9 md:h-9">
  <MoreVertical className="w-5 h-5" />
</Button>
```

---

### 6.8 Hiding/Showing Elements

**Show/Hide Patterns:**

```tsx
// Hide on mobile, show on tablet+
<div className="hidden md:block">
  {/* Complex visualizations, detailed stats */}
</div>

// Show on mobile only
<div className="md:hidden">
  {/* Simplified mobile UI, hamburger menu */}
</div>

// Show on desktop only
<div className="hidden lg:block">
  {/* Sidebar, extra columns */}
</div>
```

**Example: Dashboard Stats**

```tsx
// Mobile: Show 2 key metrics
// Desktop: Show all 6 metrics

<div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
  <StatCard label="Total Students" value="245" />
  <StatCard label="Active Assignments" value="12" />

  {/* Only show on desktop */}
  <StatCard label="Avg. Completion" value="87%" className="hidden lg:block" />
  <StatCard label="This Week" value="34" className="hidden lg:block" />
  <StatCard label="Past Due" value="3" className="hidden lg:block" />
  <StatCard label="Top Performer" value="Jane D." className="hidden lg:block" />
</div>
```

---

### 6.9 Overflow & Scrolling

**Horizontal Scroll on Mobile (when needed):**

```tsx
// Tags, categories, breadcrumbs
<div className="overflow-x-auto -mx-4 px-4 pb-2">
  <div className="flex gap-2 min-w-max">
    <Badge>Math</Badge>
    <Badge>Science</Badge>
    <Badge>English</Badge>
    <Badge>History</Badge>
    <Badge>Geography</Badge>
  </div>
</div>
```

**Vertical Scroll with Fixed Headers:**

```tsx
// Chat/messaging view
<div className="h-screen flex flex-col">
  {/* Fixed header */}
  <header className="h-16 border-b sticky top-0 bg-white dark:bg-slate-800 z-10">
    {/* Header content */}
  </header>

  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto p-4">
    {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
  </div>

  {/* Fixed input */}
  <footer className="p-4 border-t sticky bottom-0 bg-white dark:bg-slate-800">
    <Input placeholder="Type a message..." />
  </footer>
</div>
```

---

### 6.10 Testing Responsive Design

**Viewport Testing Checklist:**

- [ ] iPhone SE (375x667) - Smallest common mobile
- [ ] iPhone 12/13/14 (390x844) - Standard mobile
- [ ] iPad (768x1024) - Tablet portrait
- [ ] iPad (1024x768) - Tablet landscape
- [ ] Laptop (1280x800) - Small desktop
- [ ] Desktop (1920x1080) - Large desktop

**Key Test Scenarios:**

1. **Navigation**: Verify bottom nav on mobile, sidebar on desktop
2. **Forms**: Full-screen on mobile, dialog on desktop
3. **Tables**: Card view on mobile, table on desktop
4. **Charts**: Stacked on mobile, side-by-side on desktop
5. **Activity Player**: Canvas scales correctly, controls accessible
6. **Modals**: Full-screen on mobile, centered on desktop
7. **Touch Targets**: All buttons ≥44px on mobile
8. **Text Overflow**: Long names, emails truncate with ellipsis
9. **Images**: Maintain aspect ratio, load correctly
10. **Horizontal Scroll**: Works smoothly for wide content

**Responsive Testing Utility:**

```tsx
// src/hooks/useBreakpoint.ts
import { useEffect, useState } from 'react';

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
  };
}

// Usage
function Dashboard() {
  const { isMobile, isDesktop } = useBreakpoint();

  return (
    <div>
      {isMobile && <MobileDashboard />}
      {isDesktop && <DesktopDashboard />}
    </div>
  );
}
```

---

**End of Section 6**

---

## 7. Animation & Micro-interactions

### 7.1 Animation Philosophy

Dream LMS uses animations to **enhance usability**, **provide feedback**, and **create delight** without sacrificing performance or distracting from content. All animations follow these principles:

**Core Principles:**

1. **Purposeful**: Every animation serves a functional purpose (feedback, state change, spatial relationship)
2. **Performant**: Use CSS transforms/opacity (GPU-accelerated), avoid animating layout properties
3. **Subtle**: Animations should feel natural, not attention-grabbing (except celebrations)
4. **Fast**: Most animations 150-300ms; user-initiated actions should feel instant
5. **Respectful**: Honor `prefers-reduced-motion` for accessibility

**Timing & Easing:**

```tsx
const TIMING = {
  instant: 100,      // State changes, hover feedback
  fast: 150,         // Button clicks, checkbox toggles
  base: 200,         // Default transitions, fades
  slow: 300,         // Page transitions, complex state changes
  slower: 500,       // Celebration animations, confetti
};

const EASING = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};
```

---

### 7.2 Transition Utilities

**Base Transition Classes (Tailwind):**

```tsx
// Standard transitions
'transition-colors duration-200'       // Color changes (hover, focus)
'transition-transform duration-150'    // Scale, rotate
'transition-opacity duration-200'      // Fades
'transition-all duration-200'          // Multiple properties (use sparingly)
```

**Custom Transition Hook:**

```tsx
// src/hooks/useAnimation.ts
import { useReducedMotion } from 'framer-motion';

export function useAnimation() {
  const prefersReducedMotion = useReducedMotion();

  return {
    shouldAnimate: !prefersReducedMotion,
    duration: prefersReducedMotion ? 0 : TIMING.base,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  };
}

// Usage
const { shouldAnimate, duration } = useAnimation();

<motion.div
  animate={{ opacity: 1 }}
  transition={{ duration: shouldAnimate ? duration / 1000 : 0 }}
>
  {content}
</motion.div>
```

---

### 7.3 Button & Interactive Element States

**7.3.1 Button Hover & Active States**

```tsx
// Primary button
<Button className="
  bg-teal-600 hover:bg-teal-700
  active:scale-95
  transition-all duration-150 ease-out
  shadow-sm hover:shadow-md
">
  Click Me
</Button>

// Ghost button
<Button variant="ghost" className="
  hover:bg-slate-100 dark:hover:bg-slate-800
  active:scale-95
  transition-colors duration-150
">
  Cancel
</Button>

// Icon button with pulse on hover
<Button variant="ghost" size="icon" className="
  relative
  hover:bg-teal-50 dark:hover:bg-teal-900/20
  transition-colors duration-150
  group
">
  <Bell className="w-5 h-5 group-hover:animate-pulse" />
  {/* Notification badge */}
  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
</Button>
```

**7.3.2 Link Hover Effects**

```tsx
// Underline slide-in
<a href="#" className="
  relative
  text-teal-600 dark:text-teal-400
  hover:text-teal-700 dark:hover:text-teal-300
  transition-colors duration-150
  after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0
  after:bg-teal-600 dark:after:bg-teal-400
  after:transition-all after:duration-300 after:ease-out
  hover:after:w-full
">
  Learn More
</a>

// Glow effect
<a href="#" className="
  text-teal-600 dark:text-teal-400
  hover:drop-shadow-[0_0_8px_rgba(20,184,166,0.4)]
  transition-all duration-200
">
  View Details
</a>
```

**7.3.3 Card Hover Effects**

```tsx
// Subtle lift on hover
<div className="
  p-6 rounded-lg border border-slate-200 dark:border-slate-700
  bg-white dark:bg-slate-800
  hover:shadow-lg hover:-translate-y-1
  transition-all duration-200 ease-out
  cursor-pointer
">
  {/* Card content */}
</div>

// Glow border on hover (neumorphic style)
<div className="
  p-6 rounded-lg border border-slate-200 dark:border-slate-700
  bg-white dark:bg-slate-800
  hover:border-teal-500 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]
  transition-all duration-300
  cursor-pointer
">
  {/* Card content */}
</div>
```

---

### 7.4 Page Transitions

**7.4.1 Fade In on Mount**

```tsx
// Using Framer Motion
import { motion } from 'framer-motion';

function DashboardPage() {
  const { shouldAnimate } = useAnimation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldAnimate ? 0.2 : 0 }}
    >
      {/* Page content */}
    </motion.div>
  );
}
```

**7.4.2 Slide In from Right (for modals, detail views)**

```tsx
<motion.div
  initial={{ x: '100%', opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: '100%', opacity: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
  {/* Modal content */}
</motion.div>
```

**7.4.3 Scale In (for dialogs)**

```tsx
<motion.div
  initial={{ scale: 0.95, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.95, opacity: 0 }}
  transition={{ duration: 0.15 }}
>
  {/* Dialog content */}
</motion.div>
```

---

### 7.5 Loading States

**7.5.1 Spinner Component**

```tsx
// src/components/ui/Spinner.tsx
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={cn(
      'animate-spin rounded-full border-t-transparent',
      'border-teal-600 dark:border-teal-400',
      sizeClasses[size]
    )} />
  );
}
```

**7.5.2 Skeleton Loading**

```tsx
// Pulse animation for skeletons
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
  <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
</div>

// Shimmer effect (more polished)
// Tailwind config: Add shimmer animation
// animations: {
//   shimmer: 'shimmer 2s infinite',
// },
// keyframes: {
//   shimmer: {
//     '0%': { backgroundPosition: '-200% 0' },
//     '100%': { backgroundPosition: '200% 0' },
//   },
// },

<div className="
  h-4 rounded
  bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200
  dark:from-slate-700 dark:via-slate-600 dark:to-slate-700
  bg-[length:200%_100%]
  animate-shimmer
" />
```

**7.5.3 Progress Bar (for activity timer, uploads)**

```tsx
function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const percentage = (value / max) * 100;

  return (
    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-teal-600 dark:bg-teal-400 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Indeterminate progress (loading without known duration)
<div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
  <div className="h-full w-1/3 bg-teal-600 dark:bg-teal-400 rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
</div>

// Tailwind keyframe:
// '@keyframes slide': {
//   '0%': { transform: 'translateX(-100%)' },
//   '100%': { transform: 'translateX(400%)' },
// },
```

---

### 7.6 Activity Player Animations

**7.6.1 Drag & Drop Feedback**

```tsx
// Word being dragged
<motion.div
  drag
  dragConstraints={containerRef}
  whileDrag={{ scale: 1.05, cursor: 'grabbing', zIndex: 50 }}
  dragElastic={0.1}
  dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
  className="
    px-4 py-2 rounded-lg
    bg-teal-100 dark:bg-teal-900/30
    border-2 border-teal-500
    cursor-grab
    shadow-sm hover:shadow-md
    transition-shadow duration-150
  "
>
  {word}
</motion.div>

// Drop zone hover state
<div className={cn(
  "border-2 border-dashed rounded-lg p-4 transition-all duration-200",
  isHovered && "border-teal-500 bg-teal-50 dark:bg-teal-900/20 scale-105"
)}>
  Drop here
</div>
```

**7.6.2 Correct/Incorrect Feedback**

```tsx
// Correct answer - checkmark with bounce
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
  className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg"
>
  <CheckCircle className="w-12 h-12 text-green-600 drop-shadow-lg" />
</motion.div>

// Incorrect answer - shake animation
<motion.div
  animate={{ x: [0, -10, 10, -10, 10, 0] }}
  transition={{ duration: 0.4 }}
  className="border-2 border-red-500 rounded-lg"
>
  {content}
</motion.div>

// Tailwind keyframe for shake (alternative):
// '@keyframes shake': {
//   '0%, 100%': { transform: 'translateX(0)' },
//   '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
//   '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
// },
```

**7.6.3 Word Search - Highlighting Found Words**

```tsx
// Smooth draw line effect
<motion.line
  x1={startX}
  y1={startY}
  x2={endX}
  y2={endY}
  stroke="#14B8A6"
  strokeWidth="4"
  strokeLinecap="round"
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 1 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
/>

// Highlight cells with stagger
{foundCells.map((cell, index) => (
  <motion.div
    key={`${cell.row}-${cell.col}`}
    initial={{ backgroundColor: 'transparent' }}
    animate={{ backgroundColor: 'rgba(20, 184, 166, 0.3)' }}
    transition={{ delay: index * 0.05, duration: 0.2 }}
    className="absolute rounded"
    style={{
      left: cell.x,
      top: cell.y,
      width: cell.width,
      height: cell.height,
    }}
  />
))}
```

---

### 7.7 Celebration Animations

**7.7.1 Confetti (on activity completion)**

Using `canvas-confetti` library:

```tsx
// src/components/animations/Confetti.tsx
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  useEffect(() => {
    if (!trigger) return;

    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#14B8A6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });

      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        onComplete?.();
      }
    })();
  }, [trigger, onComplete]);

  return null;
}

// Usage
function ActivityResultScreen({ score }: { score: number }) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (score >= 90) {
      setShowConfetti(true);
    }
  }, [score]);

  return (
    <div>
      <Confetti trigger={showConfetti} />
      <h2>Great job! You scored {score}%</h2>
    </div>
  );
}
```

**7.7.2 Star Rating Animation**

```tsx
// Stars fill in with stagger
function AnimatedStarRating({ score }: { score: number }) {
  const stars = score >= 90 ? 5 : score >= 80 ? 4 : score >= 70 ? 3 : score >= 60 ? 2 : 1;

  return (
    <div className="flex gap-2">
      {Array.from({ length: 5 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: i * 0.1,
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
        >
          <Star
            className={cn(
              'w-8 h-8',
              i < stars
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
            )}
          />
        </motion.div>
      ))}
    </div>
  );
}
```

**7.7.3 Score Count-Up Animation**

```tsx
// Number animates from 0 to final score
import { animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

function ScoreCounter({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1,
      onUpdate(val) {
        node.textContent = Math.round(val).toString();
      },
    });

    return () => controls.stop();
  }, [value]);

  return <span ref={nodeRef} className="text-4xl font-bold text-teal-600" />;
}

// Usage
<div className="text-center">
  <p className="text-lg text-slate-600 dark:text-slate-400">Your Score</p>
  <div className="flex items-baseline justify-center gap-1">
    <ScoreCounter value={score} />
    <span className="text-2xl text-slate-500">%</span>
  </div>
</div>
```

---

### 7.8 Notification & Toast Animations

**Slide in from top:**

```tsx
// Using Sonner (recommended toast library)
import { Toaster, toast } from 'sonner';

// In root layout
<Toaster
  position="top-center"
  toastOptions={{
    className: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
    duration: 3000,
  }}
/>

// Trigger toast
toast.success('Assignment submitted successfully!', {
  description: 'You scored 95%',
  action: {
    label: 'View Results',
    onClick: () => navigate('/results'),
  },
});

// Custom animation (if not using Sonner)
<motion.div
  initial={{ y: -100, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -100, opacity: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  className="fixed top-4 right-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
>
  <div className="flex items-center gap-3">
    <CheckCircle className="w-5 h-5 text-green-600" />
    <p className="text-sm font-medium text-green-900 dark:text-green-100">
      Success!
    </p>
  </div>
</motion.div>
```

---

### 7.9 List & Grid Animations

**Stagger Children (for dashboard cards, assignment lists):**

```tsx
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function AssignmentList({ assignments }: { assignments: Assignment[] }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {assignments.map((assignment) => (
        <motion.div
          key={assignment.id}
          variants={itemVariants}
          className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
        >
          <h3>{assignment.name}</h3>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

**Grid Items Fade In:**

```tsx
<motion.div
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  variants={containerVariants}
  initial="hidden"
  animate="show"
>
  {books.map((book) => (
    <motion.div
      key={book.id}
      variants={itemVariants}
      whileHover={{ scale: 1.03 }}
      className="cursor-pointer"
    >
      <BookCard book={book} />
    </motion.div>
  ))}
</motion.div>
```

---

### 7.10 Form Input Animations

**Label Float on Focus:**

```tsx
<div className="relative">
  <input
    id="email"
    type="email"
    className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-teal-500 transition-colors"
    placeholder=" "
  />
  <label
    htmlFor="email"
    className="
      absolute left-4 top-4
      text-slate-500 dark:text-slate-400
      transition-all duration-200
      peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
      peer-focus:top-2 peer-focus:text-xs peer-focus:text-teal-600
    "
  >
    Email Address
  </label>
</div>
```

**Checkbox/Toggle Animations:**

```tsx
// Animated checkbox
<motion.div
  whileTap={{ scale: 0.9 }}
  className="relative"
>
  <input
    type="checkbox"
    className="peer sr-only"
    checked={checked}
    onChange={(e) => setChecked(e.target.checked)}
  />
  <div className={cn(
    "w-5 h-5 rounded border-2 transition-colors duration-150",
    checked
      ? "bg-teal-600 border-teal-600"
      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
  )}>
    <motion.svg
      viewBox="0 0 20 20"
      fill="none"
      initial={false}
      animate={{ scale: checked ? 1 : 0 }}
      transition={{ duration: 0.15 }}
    >
      <path
        d="M6 10l2 2 6-6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  </div>
</motion.div>

// Animated toggle switch
<button
  onClick={() => setEnabled(!enabled)}
  className={cn(
    "relative w-11 h-6 rounded-full transition-colors duration-200",
    enabled ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-600"
  )}
>
  <motion.div
    layout
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
    style={{ x: enabled ? 20 : 0 }}
  />
</button>
```

---

### 7.11 Micro-interactions

**7.11.1 Copy to Clipboard Feedback**

```tsx
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="w-4 h-4 text-green-600" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
```

**7.11.2 Like/Favorite Button**

```tsx
function LikeButton({ initialLiked = false }: { initialLiked?: boolean }) {
  const [liked, setLiked] = useState(initialLiked);

  return (
    <button
      onClick={() => setLiked(!liked)}
      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
    >
      <motion.div
        whileTap={{ scale: 0.8 }}
        animate={{ scale: liked ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart
          className={cn(
            'w-5 h-5 transition-colors duration-150',
            liked
              ? 'fill-red-500 text-red-500'
              : 'text-slate-400'
          )}
        />
      </motion.div>
    </button>
  );
}
```

**7.11.3 Tooltip Fade In**

```tsx
// Using Radix UI Tooltip with custom animation
import * as Tooltip from '@radix-ui/react-tooltip';

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <button className="p-2">
        <Info className="w-4 h-4" />
      </button>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        className="
          bg-slate-900 dark:bg-slate-100
          text-white dark:text-slate-900
          px-3 py-2 rounded text-sm
          animate-in fade-in-0 zoom-in-95
          data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
        "
        sideOffset={5}
      >
        Helpful information here
        <Tooltip.Arrow className="fill-slate-900 dark:fill-slate-100" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

---

### 7.12 Accessibility: Respecting Reduced Motion

**Global CSS for reduced motion:**

```css
/* src/styles/globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**React Hook for Reduced Motion:**

```tsx
// src/hooks/useReducedMotion.ts
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Usage
function AnimatedComponent() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
    >
      Content
    </motion.div>
  );
}
```

---

### 7.13 Performance Considerations

**Best Practices:**

1. **Use `transform` and `opacity`**: GPU-accelerated, no layout reflow
   ```tsx
   // ✅ Good
   <motion.div animate={{ x: 100, opacity: 0.5 }} />

   // ❌ Avoid
   <motion.div animate={{ left: 100, visibility: 'hidden' }} />
   ```

2. **Use `will-change` sparingly**: Only for elements about to animate
   ```tsx
   <div className="will-change-transform hover:scale-105 transition-transform" />
   ```

3. **Debounce scroll/resize animations**:
   ```tsx
   const [scrollY, setScrollY] = useState(0);

   useEffect(() => {
     const handleScroll = throttle(() => {
       setScrollY(window.scrollY);
     }, 100);

     window.addEventListener('scroll', handleScroll);
     return () => window.removeEventListener('scroll', handleScroll);
   }, []);
   ```

4. **Use `AnimatePresence` for exit animations**:
   ```tsx
   <AnimatePresence>
     {show && (
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
       >
         Content
       </motion.div>
     )}
   </AnimatePresence>
   ```

5. **Avoid animating many elements simultaneously**: Use stagger with limits
   ```tsx
   // Limit stagger to first 10 items
   {items.slice(0, 10).map((item, i) => (
     <motion.div
       key={item.id}
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       transition={{ delay: i * 0.05 }}
     >
       {item.name}
     </motion.div>
   ))}
   ```

---

**End of Section 7**

---

## 8. Accessibility Implementation (WCAG 2.1 AA)

### 8.1 Accessibility Philosophy

Dream LMS is designed to be **inclusive and accessible** to all users, including those with disabilities. We aim for **WCAG 2.1 Level AA compliance** across all features, ensuring that:

- All functionality is **keyboard accessible**
- Content is **perceivable** by screen readers and assistive technologies
- **Color contrast** meets minimum standards
- **Focus indicators** are clear and visible
- **Error messages** are descriptive and actionable
- Users can **customize** their experience (reduced motion, dark mode, font sizes)

**Four WCAG Principles (POUR):**

1. **Perceivable**: Information and UI components must be presentable to users in ways they can perceive
2. **Operable**: UI components and navigation must be operable
3. **Understandable**: Information and operation of UI must be understandable
4. **Robust**: Content must be robust enough to be interpreted reliably by assistive technologies

---

### 8.2 Keyboard Navigation

**8.2.1 Focus Management**

All interactive elements must be keyboard accessible via `Tab`, `Shift+Tab`, `Enter`, `Space`, and arrow keys.

**Focus Indicators:**

```tsx
// Global focus styles (Tailwind config)
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      // Custom focus ring
      ringColor: {
        DEFAULT: '#14B8A6', // Teal
      },
      ringOffsetWidth: {
        DEFAULT: '2px',
      },
    },
  },
};

// Usage in components
<button className="
  focus:outline-none
  focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
  focus:ring-offset-white dark:focus:ring-offset-slate-900
  rounded-lg px-4 py-2
">
  Click Me
</button>

// Skip to main content link
<a
  href="#main-content"
  className="
    sr-only focus:not-sr-only
    focus:absolute focus:top-4 focus:left-4
    focus:z-50
    bg-teal-600 text-white
    px-4 py-2 rounded-lg
    focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
  "
>
  Skip to main content
</a>
```

**8.2.2 Tab Order & Focus Trapping**

**Modal Focus Trap:**

```tsx
import { Dialog } from '@headlessui/react'; // Focus trap built-in
import FocusTrap from 'focus-trap-react';

function AssignmentDialog({ open, onClose }: DialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <Dialog.Overlay className="fixed inset-0 bg-black/30" />

      <FocusTrap>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Create Assignment
            </Dialog.Title>

            {/* Dialog content */}
            <form>
              <input autoFocus type="text" aria-label="Assignment name" />
              {/* More fields */}
            </form>

            <div className="flex gap-3 mt-6">
              <button onClick={onClose}>Cancel</button>
              <button type="submit">Create</button>
            </div>
          </Dialog.Panel>
        </div>
      </FocusTrap>
    </Dialog>
  );
}
```

**8.2.3 Keyboard Shortcuts**

Common shortcuts for productivity:

```tsx
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + K: Quick search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        // Open search modal
      }

      // Escape: Close modal/dialog
      if (event.key === 'Escape') {
        // Close current modal
      }

      // ? : Show keyboard shortcuts help
      if (event.shiftKey && event.key === '?') {
        event.preventDefault();
        // Show shortcuts modal
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

// Keyboard shortcuts help modal
function KeyboardShortcutsHelp() {
  return (
    <Dialog>
      <Dialog.Title>Keyboard Shortcuts</Dialog.Title>
      <table className="w-full">
        <tbody>
          <tr>
            <td><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">⌘ K</kbd></td>
            <td>Quick search</td>
          </tr>
          <tr>
            <td><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Esc</kbd></td>
            <td>Close dialog</td>
          </tr>
          <tr>
            <td><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">?</kbd></td>
            <td>Show shortcuts</td>
          </tr>
        </tbody>
      </table>
    </Dialog>
  );
}
```

**8.2.4 Arrow Key Navigation (for lists, menus)**

```tsx
// Dropdown menu with arrow key navigation
import { Menu } from '@headlessui/react';

<Menu>
  <Menu.Button>Options</Menu.Button>
  <Menu.Items>
    {/* HeadlessUI handles arrow key navigation automatically */}
    <Menu.Item>
      {({ active }) => (
        <button className={active ? 'bg-teal-100' : ''}>
          Edit
        </button>
      )}
    </Menu.Item>
    <Menu.Item>
      {({ active }) => (
        <button className={active ? 'bg-teal-100' : ''}>
          Delete
        </button>
      )}
    </Menu.Item>
  </Menu.Items>
</Menu>
```

---

### 8.3 Screen Reader Support

**8.3.1 Semantic HTML**

Always use semantic HTML elements over generic divs:

```tsx
// ✅ Good - Semantic HTML
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/dashboard">Dashboard</a></li>
      <li><a href="/assignments">Assignments</a></li>
    </ul>
  </nav>
</header>

<main id="main-content">
  <article>
    <h1>Assignment Title</h1>
    <section>
      <h2>Instructions</h2>
      <p>Complete the following...</p>
    </section>
  </article>
</main>

<footer>
  <p>&copy; 2025 Dream LMS</p>
</footer>

// ❌ Bad - Div soup
<div className="header">
  <div className="nav">
    <div className="link">Dashboard</div>
    <div className="link">Assignments</div>
  </div>
</div>
```

**8.3.2 ARIA Labels & Descriptions**

```tsx
// Icon-only buttons
<button aria-label="Close dialog">
  <X className="w-5 h-5" />
</button>

// Search input
<input
  type="search"
  aria-label="Search assignments"
  placeholder="Search..."
/>

// Complex widget
<div
  role="region"
  aria-labelledby="analytics-heading"
  aria-describedby="analytics-description"
>
  <h2 id="analytics-heading">Performance Analytics</h2>
  <p id="analytics-description">
    View your performance over time with detailed charts and statistics
  </p>
  {/* Chart content */}
</div>

// Loading state
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? 'Loading assignments...' : `${assignments.length} assignments found`}
</div>
```

**8.3.3 ARIA Live Regions**

For dynamic content updates:

```tsx
// Success notification
<div
  role="status"
  aria-live="polite"
  className="sr-only"
>
  {successMessage}
</div>

// Error alert
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  className={error ? 'block' : 'sr-only'}
>
  {error}
</div>

// Progress indicator
function ActivityTimer({ timeRemaining }: { timeRemaining: number }) {
  return (
    <div>
      <div aria-live="off" aria-atomic="true">
        Time remaining: {formatTime(timeRemaining)}
      </div>

      {/* Announce every minute */}
      {timeRemaining % 60 === 0 && (
        <div className="sr-only" aria-live="polite">
          {Math.floor(timeRemaining / 60)} minutes remaining
        </div>
      )}
    </div>
  );
}
```

**8.3.4 Visually Hidden Text**

```tsx
// Tailwind utility class
// .sr-only is already provided by Tailwind

// Example: Data table with sortable columns
<table>
  <thead>
    <tr>
      <th>
        <button onClick={() => sortBy('name')}>
          Name
          {sortColumn === 'name' && (
            <>
              <span className="sr-only">
                {sortDirection === 'asc' ? 'sorted ascending' : 'sorted descending'}
              </span>
              <ChevronDown className={cn(
                'w-4 h-4 inline ml-1',
                sortDirection === 'asc' && 'rotate-180'
              )} aria-hidden="true" />
            </>
          )}
        </button>
      </th>
    </tr>
  </thead>
</table>

// Loading spinner
<div className="flex items-center gap-2">
  <Spinner />
  <span className="sr-only">Loading...</span>
</div>
```

---

### 8.4 Color Contrast

**8.4.1 Contrast Requirements**

- **Normal text** (< 18px): Minimum contrast ratio 4.5:1
- **Large text** (≥ 18px or ≥ 14px bold): Minimum contrast ratio 3:1
- **UI components & graphical objects**: Minimum contrast ratio 3:1

**Color Palette Compliance:**

All Dream LMS colors meet WCAG AA standards:

```tsx
// Text on backgrounds
const CONTRAST_COMPLIANT_PAIRS = {
  // Light mode
  light: {
    bodyText: { fg: '#475569', bg: '#FFFFFF' }, // Slate-600 on white - 7.6:1 ✅
    heading: { fg: '#0F172A', bg: '#FFFFFF' },  // Slate-900 on white - 16.1:1 ✅
    primary: { fg: '#FFFFFF', bg: '#14B8A6' },  // White on Teal-500 - 4.5:1 ✅
    secondary: { fg: '#334155', bg: '#F1F5F9' }, // Slate-700 on Slate-100 - 8.9:1 ✅
  },

  // Dark mode
  dark: {
    bodyText: { fg: '#CBD5E1', bg: '#1E293B' }, // Slate-300 on Slate-800 - 8.2:1 ✅
    heading: { fg: '#F1F5F9', bg: '#1E293B' },  // Slate-100 on Slate-800 - 13.1:1 ✅
    primary: { fg: '#0F172A', bg: '#14B8A6' },  // Slate-900 on Teal-500 - 8.1:1 ✅
    secondary: { fg: '#E2E8F0', bg: '#334155' }, // Slate-200 on Slate-700 - 9.7:1 ✅
  },
};
```

**8.4.2 Non-Color Indicators**

Never rely on color alone to convey information:

```tsx
// ❌ Bad - Color only
<span className="text-green-600">Correct</span>
<span className="text-red-600">Incorrect</span>

// ✅ Good - Color + icon + text
<span className="flex items-center gap-1 text-green-600">
  <CheckCircle className="w-4 h-4" aria-hidden="true" />
  <span>Correct</span>
</span>

<span className="flex items-center gap-1 text-red-600">
  <XCircle className="w-4 h-4" aria-hidden="true" />
  <span>Incorrect</span>
</span>

// Form validation
<input
  aria-invalid={hasError}
  aria-describedby={hasError ? 'email-error' : undefined}
  className={cn(
    'border-2',
    hasError && 'border-red-500'
  )}
/>
{hasError && (
  <p id="email-error" className="text-sm text-red-600 flex items-center gap-1 mt-1">
    <AlertCircle className="w-4 h-4" aria-hidden="true" />
    <span>Please enter a valid email address</span>
  </p>
)}
```

---

### 8.5 Form Accessibility

**8.5.1 Labels & Instructions**

```tsx
// Always associate labels with inputs
<div>
  <label htmlFor="student-name" className="block text-sm font-medium mb-1">
    Student Name
    <span className="text-red-500" aria-label="required">*</span>
  </label>
  <input
    id="student-name"
    type="text"
    required
    aria-required="true"
    aria-describedby="student-name-hint"
  />
  <p id="student-name-hint" className="text-sm text-slate-500 mt-1">
    First and last name
  </p>
</div>

// Group related inputs
<fieldset>
  <legend className="text-lg font-semibold mb-3">Assignment Settings</legend>

  <div>
    <label htmlFor="due-date">Due Date</label>
    <input id="due-date" type="date" />
  </div>

  <div>
    <label htmlFor="time-limit">Time Limit (minutes)</label>
    <input id="time-limit" type="number" />
  </div>
</fieldset>
```

**8.5.2 Error Handling**

```tsx
// Announce errors to screen readers
function LoginForm() {
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');

  return (
    <form aria-labelledby="login-heading">
      <h2 id="login-heading">Sign In</h2>

      {/* Global form error */}
      {formError && (
        <div
          role="alert"
          className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>{formError}</span>
          </p>
        </div>
      )}

      {/* Email field */}
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-sm text-red-600 mt-1">
            {errors.email}
          </p>
        )}
      </div>

      <button type="submit">Sign In</button>
    </form>
  );
}
```

**8.5.3 Input Types & Autocomplete**

```tsx
// Use appropriate input types
<input type="email" autoComplete="email" />
<input type="tel" autoComplete="tel" />
<input type="url" />
<input type="date" />
<input type="number" min="0" max="100" step="1" />

// Password with show/hide toggle
function PasswordInput() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
```

---

### 8.6 Alternative Text for Images

```tsx
// Decorative images (no alt needed)
<img src="/pattern.svg" alt="" role="presentation" />

// Informative images
<img
  src="/book-cover.jpg"
  alt="Cover of 'Introduction to Biology' textbook showing a DNA helix"
/>

// Functional images (buttons, links)
<button>
  <img src="/download.svg" alt="Download assignment results" />
</button>

// Complex images (charts, diagrams)
<figure>
  <img
    src="/performance-chart.png"
    alt="Bar chart showing student performance across 6 activity types"
    aria-describedby="chart-description"
  />
  <figcaption id="chart-description">
    The chart shows average scores for each activity type:
    Drag & Drop: 85%, Word Matching: 92%, Word Search: 88%,
    Select Areas: 78%, Mark with X: 81%, Categorization: 90%.
  </figcaption>
</figure>

// Avatar fallback
<Avatar>
  <AvatarImage src={student.avatar_url} alt={`${student.name}'s profile picture`} />
  <AvatarFallback aria-label={`${student.name} (no profile picture)`}>
    {student.name[0]}
  </AvatarFallback>
</Avatar>
```

---

### 8.7 Activity Player Accessibility

**8.7.1 Drag & Drop Accessibility**

Provide keyboard alternative for drag & drop:

```tsx
function AccessibleDragDrop() {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  return (
    <div>
      {/* Word bank */}
      <div role="group" aria-labelledby="word-bank-heading">
        <h3 id="word-bank-heading">Available Words</h3>
        <div className="flex flex-wrap gap-2">
          {words.map((word) => (
            <button
              key={word}
              onClick={() => setSelectedWord(word)}
              aria-pressed={selectedWord === word}
              className={cn(
                'px-4 py-2 rounded-lg border-2',
                selectedWord === word && 'border-teal-500 bg-teal-50'
              )}
            >
              {word}
              {selectedWord === word && (
                <span className="sr-only"> (selected)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zones */}
      <div role="group" aria-labelledby="drop-zones-heading">
        <h3 id="drop-zones-heading">Drop Zones</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Select a word above, then choose a drop zone below
        </p>
        {dropZones.map((zone, index) => (
          <button
            key={zone.id}
            onClick={() => handleDrop(zone.id, selectedWord)}
            disabled={!selectedWord}
            aria-label={`Drop zone ${index + 1}${zone.word ? `, currently contains ${zone.word}` : ', empty'}`}
            className={cn(
              'block w-full p-4 mb-2 border-2 border-dashed rounded-lg',
              selectedWord && 'hover:border-teal-500 hover:bg-teal-50'
            )}
          >
            {zone.word || 'Empty'}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**8.7.2 Timer Announcements**

```tsx
function ActivityTimer({ duration }: { duration: number }) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [lastAnnouncement, setLastAnnouncement] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;

        // Announce at 5 min, 2 min, 1 min, 30 sec, 10 sec
        if (
          newTime === 300 ||
          newTime === 120 ||
          newTime === 60 ||
          newTime === 30 ||
          newTime === 10
        ) {
          setLastAnnouncement(newTime);
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Visual timer */}
      <div aria-hidden="true" className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span>{formatTime(timeRemaining)}</span>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {lastAnnouncement === 300 && '5 minutes remaining'}
        {lastAnnouncement === 120 && '2 minutes remaining'}
        {lastAnnouncement === 60 && '1 minute remaining'}
        {lastAnnouncement === 30 && '30 seconds remaining'}
        {lastAnnouncement === 10 && '10 seconds remaining. Hurry!'}
      </div>
    </>
  );
}
```

**8.7.3 Results Announcements**

```tsx
function ActivityResults({ score, totalQuestions, correctAnswers }: ResultsProps) {
  return (
    <div>
      {/* Visual results */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Activity Complete!</h2>
        <div className="text-4xl font-bold text-teal-600 mb-4">{score}%</div>
        <p>You got {correctAnswers} out of {totalQuestions} correct.</p>
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Activity completed. You scored {score} percent.
        {correctAnswers} out of {totalQuestions} answers were correct.
        {score >= 90 && ' Excellent work!'}
        {score >= 70 && score < 90 && ' Good job!'}
        {score < 70 && ' Keep practicing!'}
      </div>

      {/* Confetti for high scores */}
      {score >= 90 && <Confetti trigger={true} />}
    </div>
  );
}
```

---

### 8.8 Data Table Accessibility

```tsx
function AccessibleStudentTable({ students }: { students: Student[] }) {
  return (
    <table role="table" aria-label="Student list">
      <caption className="sr-only">
        List of {students.length} students with their grades and average scores
      </caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
          <th scope="col">Grade Level</th>
          <th scope="col">Average Score</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.id}>
            <th scope="row">{student.name}</th>
            <td>{student.email}</td>
            <td>{student.grade_level}</td>
            <td>
              <span aria-label={`${student.average_score} percent`}>
                {student.average_score}%
              </span>
            </td>
            <td>
              <button aria-label={`View ${student.name}'s details`}>
                View
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### 8.9 Testing & Validation

**8.9.1 Automated Testing Tools**

```tsx
// Install axe-core for automated accessibility testing
// npm install --save-dev @axe-core/react

// src/index.tsx (development only)
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}

// Jest + Testing Library
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Button component should have no accessibility violations', async () => {
  const { container } = render(<Button>Click Me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**8.9.2 Manual Testing Checklist**

- [ ] **Keyboard Navigation**: Tab through entire app, verify focus order
- [ ] **Screen Reader**: Test with NVDA (Windows), JAWS (Windows), VoiceOver (macOS/iOS)
- [ ] **Zoom**: Test at 200% browser zoom (WCAG requirement)
- [ ] **Color Blindness**: Test with color blindness simulators (Protanopia, Deuteranopia, Tritanopia)
- [ ] **Contrast**: Use browser DevTools or WebAIM Contrast Checker
- [ ] **Reduced Motion**: Enable in OS settings, verify animations respect preference
- [ ] **Forms**: Verify error messages are announced, labels are associated
- [ ] **ARIA**: Verify live regions announce updates, roles are appropriate

**8.9.3 Browser Extensions**

- **axe DevTools**: Automated accessibility scanning
- **WAVE**: Visual feedback about accessibility issues
- **Lighthouse**: Built-in Chrome DevTools accessibility audit
- **ARC Toolkit**: Comprehensive accessibility testing
- **NoCoffee**: Simulates various vision impairments

**8.9.4 Lighthouse Accessibility Audit**

```bash
# Run Lighthouse CI in terminal
npm install -g @lhci/cli

lhci autorun --collect.url=http://localhost:3000 --collect.settings.onlyCategories=accessibility
```

Target: **90+ Lighthouse Accessibility Score**

---

### 8.10 Accessibility Checklist Summary

**Global Requirements:**

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible on all interactive elements
- [ ] Color contrast meets WCAG AA standards (4.5:1 for text, 3:1 for UI components)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Skip to main content link is provided
- [ ] Page language is set (`<html lang="en">`)

**Content:**

- [ ] All images have appropriate alt text
- [ ] Headings are used in correct order (h1 → h2 → h3, no skipping levels)
- [ ] Links have descriptive text (no "click here")
- [ ] No information conveyed by color alone

**Forms:**

- [ ] All inputs have associated labels
- [ ] Required fields are marked with `aria-required` or `required`
- [ ] Error messages are announced to screen readers
- [ ] Form submission errors are summarized at top of form

**Interactive Components:**

- [ ] Buttons use `<button>` element (not `<div>` with click handler)
- [ ] Modals trap focus and return focus on close
- [ ] Dropdown menus support arrow key navigation
- [ ] Tables use proper `<th>` and `scope` attributes
- [ ] ARIA roles and properties are used correctly

**Dynamic Content:**

- [ ] Loading states are announced (`aria-live="polite"`)
- [ ] Error alerts are announced (`role="alert"`, `aria-live="assertive"`)
- [ ] Success messages are announced
- [ ] Timer warnings are announced at key intervals

---

**End of Section 8**

---

## Conclusion

This Front-End Specification provides comprehensive guidance for building Dream LMS with a focus on:

1. **Consistent Design**: Teal/cyan color palette, neumorphic effects, dark mode
2. **Component Architecture**: Modular, reusable components with Shadcn UI
3. **Activity Players**: Six interactive activity types with accurate data structures
4. **Data Visualization**: Recharts-based analytics for teachers and students
5. **Responsive Design**: Mobile-first approach with breakpoints for all devices
6. **Animations**: Purposeful, performant micro-interactions and celebrations
7. **Accessibility**: WCAG 2.1 AA compliance with keyboard navigation and screen reader support

**Next Steps:**

- Review with stakeholders for feedback
- Begin component library setup (Shadcn UI, Tailwind configuration)
- Implement design tokens and theme system
- Start with core components (Button, Input, Card)
- Build activity player framework
- Iterate based on user testing and feedback

**Document Version:** 1.0
**Last Updated:** 2025-10-23
**Author:** Sally (UX Expert, BMad-Method)
