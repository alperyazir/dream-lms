import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink, useLocation } from "@tanstack/react-router"
import { AnimatePresence, motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { Sparkles } from "lucide-react"
import { useState } from "react"
import {
  FiActivity,
  FiBarChart2,
  FiBook,
  FiBriefcase,
  FiCalendar,
  FiChevronDown,
  FiClipboard,
  FiFolder,
  FiHome,
  FiMessageSquare,
  FiSettings,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic, UserRole } from "@/client"
import { PublisherLogo } from "@/components/ui/publisher-logo"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getStudentAssignments } from "@/services/assignmentsApi"
import { getMyProfile } from "@/services/publishersApi"

interface SidebarItemsProps {
  onClose?: () => void
  isCollapsed?: boolean
}

type IconComponent = IconType | LucideIcon

interface SubItem {
  icon: IconComponent
  title: string
  path: string
}

interface Item {
  icon: IconComponent
  title: string
  path: string
  comingSoon?: boolean
  children?: SubItem[]
}

interface AdminStats {
  total_publishers?: number
  active_schools?: number
  total_teachers?: number
  total_students?: number
}

// Role-specific menu items
const roleMenuItems: Record<UserRole, Item[]> = {
  admin: [
    { icon: FiHome, title: "Dashboard", path: "/admin/dashboard" },
    { icon: FiShield, title: "Supervisors", path: "/admin/supervisors" },
    { icon: FiBriefcase, title: "Publishers", path: "/admin/publishers" },
    { icon: FiTrendingUp, title: "Schools", path: "/admin/schools" },
    { icon: FiUsers, title: "Teachers", path: "/admin/teachers" },
    { icon: FiBook, title: "Library", path: "/admin/books" },
    { icon: FiUsers, title: "Students", path: "/admin/students" },
    { icon: FiClipboard, title: "Assignments", path: "/admin/assignments" },
    { icon: FiBarChart2, title: "Benchmarks", path: "/admin/benchmarks" },
    { icon: FiActivity, title: "AI Usage", path: "/admin/ai-usage" },
    { icon: Sparkles, title: "DreamAI", path: "/dreamai" },
  ],
  supervisor: [
    { icon: FiHome, title: "Dashboard", path: "/admin/dashboard" },
    { icon: FiBriefcase, title: "Publishers", path: "/admin/publishers" },
    { icon: FiTrendingUp, title: "Schools", path: "/admin/schools" },
    { icon: FiUsers, title: "Teachers", path: "/admin/teachers" },
    { icon: FiBook, title: "Library", path: "/admin/books" },
    { icon: FiUsers, title: "Students", path: "/admin/students" },
    { icon: FiClipboard, title: "Assignments", path: "/admin/assignments" },
    { icon: FiBarChart2, title: "Benchmarks", path: "/admin/benchmarks" },
    { icon: Sparkles, title: "DreamAI", path: "/dreamai" },
  ],
  publisher: [
    { icon: FiHome, title: "Dashboard", path: "/publisher/dashboard" },
    { icon: FiBook, title: "Library", path: "/publisher/library" },
    { icon: FiTrendingUp, title: "Schools", path: "/publisher/schools" },
    { icon: FiUsers, title: "Teachers", path: "/publisher/teachers" },
  ],
  teacher: [
    { icon: FiHome, title: "Dashboard", path: "/teacher/dashboard" },
    { icon: FiCalendar, title: "Calendar", path: "/teacher/calendar" },
    { icon: FiBook, title: "Library", path: "/teacher/books" },
    { icon: FiFolder, title: "My Materials", path: "/teacher/materials" },
    { icon: Sparkles, title: "DreamAI", path: "/dreamai" },
    { icon: FiTrendingUp, title: "Classrooms", path: "/teacher/classrooms" },
    { icon: FiUsers, title: "Students", path: "/teacher/students" },
    { icon: FiClipboard, title: "Assignments", path: "/teacher/assignments" },
    { icon: FiBarChart2, title: "Analytics", path: "/teacher/analytics" },
    {
      icon: FiMessageSquare,
      title: "Announcements",
      path: "/teacher/announcements",
    },
    { icon: FiTrendingUp, title: "Reports", path: "/teacher/reports" },
  ],
  student: [
    { icon: FiHome, title: "Dashboard", path: "/student/dashboard" },
    { icon: FiCalendar, title: "Calendar", path: "/student/calendar" },
    { icon: FiClipboard, title: "Assignments", path: "/student/assignments" },
    {
      icon: FiMessageSquare,
      title: "Announcements",
      path: "/student/announcements",
    },
    { icon: FiTrendingUp, title: "My Progress", path: "/student/progress" },
  ],
}

const SidebarItems = ({ onClose, isCollapsed = false }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const location = useLocation()

  // Track which collapsible menus are expanded
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
    location.pathname.startsWith("/dreamai") ? { DreamAI: true } : {},
  )

  const userRole = (currentUser?.role || "student") as UserRole
  const menuItems = roleMenuItems[userRole] || roleMenuItems.student

  // Toggle menu expansion
  const toggleMenu = (title: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  // Check if a path matches the current location (exact or sub-route)
  const isPathActive = (path: string): boolean =>
    location.pathname === path || location.pathname.startsWith(path + "/")

  // Check if any child path is active
  const isChildActive = (children: SubItem[] | undefined): boolean => {
    if (!children) return false
    return children.some((child) => isPathActive(child.path))
  }

  // Fetch real stats for admin users
  const adminStats = undefined as AdminStats | undefined

  // Fetch student assignments for notification badge
  const { data: studentAssignments = [] } = useQuery({
    queryKey: ["studentAssignments"],
    queryFn: () => getStudentAssignments(),
    enabled: userRole === "student",
  })

  // Fetch publisher profile for logo display
  const { data: publisherProfile } = useQuery({
    queryKey: ["publisherProfile"],
    queryFn: () => getMyProfile(),
    enabled: userRole === "publisher",
    staleTime: 5 * 60 * 1000,
  })

  // Count incomplete student assignments
  const incompleteAssignmentsCount = Array.isArray(studentAssignments)
    ? studentAssignments.filter(
        (assignment) => assignment.status !== "completed",
      ).length
    : 0

  // Get count for each path
  const getItemCount = (path: string): number | null => {
    switch (path) {
      case "/admin/publishers":
        return adminStats?.total_publishers ?? null
      case "/admin/schools":
        return adminStats?.active_schools ?? null
      case "/admin/teachers":
        return adminStats?.total_teachers ?? null
      case "/admin/books":
        return null
      case "/admin/students":
        return adminStats?.total_students ?? null
      case "/admin/assignments":
        return null
      case "/publisher/library":
        return null
      case "/publisher/schools":
        return null
      case "/publisher/teachers":
        return null
      case "/student/assignments":
        return incompleteAssignmentsCount > 0
          ? incompleteAssignmentsCount
          : null
      default:
        return null
    }
  }

  // Render a sub-menu item
  const renderSubMenuItem = (subItem: SubItem, index: number) => {
    const { icon: IconComponent, title, path } = subItem
    const isActive = isPathActive(path)

    return (
      <motion.div
        key={title}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <RouterLink to={path} onClick={onClose}>
          <div
            className={`flex items-center text-sm transition-all duration-200 ml-4 pl-6 pr-4 py-2 rounded-lg ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <IconComponent className="h-4 w-4 flex-shrink-0" />
            <span className="ml-3">{title}</span>
          </div>
        </RouterLink>
      </motion.div>
    )
  }

  // Wrapper component for tooltip on collapsed state
  const MenuItemWrapper = ({
    title,
    isCollapsed,
    children,
  }: {
    title: string
    isCollapsed: boolean
    children: React.ReactNode
  }) => {
    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    return <>{children}</>
  }

  const renderMenuItem = (item: Item, _index: number) => {
    const { icon: IconComponent, title, path, comingSoon, children } = item
    const isActive = isPathActive(path)
    const hasActiveChild = isChildActive(children)
    const isExpanded = expandedMenus[title] || hasActiveChild
    const itemCount = getItemCount(path)

    // Render collapsible menu with children
    if (children && children.length > 0) {
      const parentContent = (
        <motion.button
          type="button"
          onClick={() => !isCollapsed && toggleMenu(title)}
          className={`w-full flex items-center text-sm transition-all duration-200 rounded-lg mx-2 ${
            isCollapsed ? "justify-center py-3 px-0 w-12" : "gap-3 px-4 py-2.5"
          } ${
            hasActiveChild
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
          style={{ width: isCollapsed ? 48 : "calc(100% - 16px)" }}
          title={isCollapsed ? title : undefined}
        >
          <IconComponent className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                className="flex items-center flex-1"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span
                  className={`flex-1 text-left whitespace-nowrap ${hasActiveChild ? "font-medium" : ""}`}
                >
                  {title}
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiChevronDown className="h-4 w-4" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      )

      return (
        <div key={title} className="mb-1">
          <MenuItemWrapper title={title} isCollapsed={isCollapsed}>
            {parentContent}
          </MenuItemWrapper>
          {/* Render children when expanded (and not collapsed sidebar) */}
          <AnimatePresence>
            {isExpanded && !isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="py-1">
                  {children.map((child, idx) => renderSubMenuItem(child, idx))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    // Render regular menu item (no children)
    const content = (
      <motion.div
        className={`flex items-center text-sm transition-all duration-200 rounded-lg mx-2 relative ${
          isCollapsed ? "justify-center py-3 px-0 w-12" : "gap-3 px-4 py-2.5"
        } ${
          isActive
            ? "bg-primary/10 text-primary font-medium border-l-[3px] border-primary"
            : "hover:bg-muted text-muted-foreground hover:text-foreground border-l-[3px] border-transparent"
        } ${comingSoon ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{ width: isCollapsed ? 48 : "calc(100% - 16px)" }}
        title={isCollapsed ? title : undefined}
      >
        <IconComponent className="h-5 w-5 flex-shrink-0" />

        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              className="flex items-center flex-1 overflow-hidden"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="flex-1 whitespace-nowrap">{title}</span>
              {itemCount !== null && !comingSoon && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                    path === "/student/assignments"
                      ? "bg-destructive text-destructive-foreground font-medium"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {itemCount}
                </span>
              )}
              {comingSoon && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full ml-2">
                  Soon
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show notification dot when collapsed and has count */}
        {isCollapsed && itemCount !== null && !comingSoon && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        )}
      </motion.div>
    )

    if (comingSoon) {
      return (
        <div key={title} className="mb-1">
          <MenuItemWrapper
            title={`${title} (Coming Soon)`}
            isCollapsed={isCollapsed}
          >
            {content}
          </MenuItemWrapper>
        </div>
      )
    }

    return (
      <div key={title} className="mb-1">
        <MenuItemWrapper title={title} isCollapsed={isCollapsed}>
          <RouterLink to={path} onClick={onClose}>
            {content}
          </RouterLink>
        </MenuItemWrapper>
      </div>
    )
  }

  const bottomItems: Item[] = [
    { icon: FiSettings, title: "Settings", path: "/settings" },
  ]

  if (currentUser?.is_superuser) {
    bottomItems.push({
      icon: FiUsers,
      title: "User Management",
      path: "/admin/users",
    })
  }

  return (
    <>
      {/* Publisher Logo Section */}
      {userRole === "publisher" && publisherProfile && (
        <div
          className={`border-b border-border/50 mb-4 ${
            isCollapsed ? "py-3 px-2" : "p-4"
          } flex justify-center`}
        >
          <PublisherLogo
            publisherId={publisherProfile.id}
            size="md"
            alt={`${publisherProfile.name} logo`}
          />
        </div>
      )}

      {/* Main Menu Items */}
      <div className="flex-1 flex flex-col">
        {menuItems.map((item, index) => renderMenuItem(item, index))}
      </div>

      {/* Bottom Section */}
      <div className="border-t border-border/50 pt-4 mt-auto">
        {bottomItems.map((item, index) => renderMenuItem(item, index))}
      </div>
    </>
  )
}

export default SidebarItems
