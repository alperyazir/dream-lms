import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink, useLocation } from "@tanstack/react-router"
import {
  FiBarChart2,
  FiBook,
  FiBriefcase,
  FiCalendar,
  FiClipboard,
  FiFolder,
  FiHome,
  FiSettings,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic, UserRole } from "@/client"
import { PublisherLogo } from "@/components/ui/publisher-logo"
import { getStudentAssignments } from "@/services/assignmentsApi"
import { getMyProfile } from "@/services/publishersApi"

interface SidebarItemsProps {
  onClose?: () => void
  isCollapsed?: boolean
}

interface Item {
  icon: IconType
  title: string
  path: string
  comingSoon?: boolean
  dataTour?: string
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
    {
      icon: FiHome,
      title: "Dashboard",
      path: "/admin/dashboard",
      dataTour: "sidebar-dashboard",
    },
    { icon: FiShield, title: "Supervisors", path: "/admin/supervisors" },
    { icon: FiBriefcase, title: "Publishers", path: "/admin/publishers" },
    { icon: FiTrendingUp, title: "Schools", path: "/admin/schools" },
    { icon: FiUsers, title: "Teachers", path: "/admin/teachers" },
    { icon: FiBook, title: "Library", path: "/admin/books" },
    { icon: FiUsers, title: "Students", path: "/admin/students" },
    { icon: FiClipboard, title: "Assignments", path: "/admin/assignments" },
    { icon: FiBarChart2, title: "Benchmarks", path: "/admin/benchmarks" },
  ],
  supervisor: [
    {
      icon: FiHome,
      title: "Dashboard",
      path: "/admin/dashboard",
      dataTour: "sidebar-dashboard",
    },
    // Supervisors cannot manage other supervisors, so no Supervisors menu item
    { icon: FiBriefcase, title: "Publishers", path: "/admin/publishers" },
    { icon: FiTrendingUp, title: "Schools", path: "/admin/schools" },
    { icon: FiUsers, title: "Teachers", path: "/admin/teachers" },
    { icon: FiBook, title: "Library", path: "/admin/books" },
    { icon: FiUsers, title: "Students", path: "/admin/students" },
    { icon: FiClipboard, title: "Assignments", path: "/admin/assignments" },
    { icon: FiBarChart2, title: "Benchmarks", path: "/admin/benchmarks" },
  ],
  publisher: [
    {
      icon: FiHome,
      title: "Dashboard",
      path: "/publisher/dashboard",
      dataTour: "sidebar-dashboard",
    },
    {
      icon: FiBook,
      title: "Library",
      path: "/publisher/library",
      dataTour: "sidebar-library",
    },
    {
      icon: FiTrendingUp,
      title: "Schools",
      path: "/publisher/schools",
      dataTour: "sidebar-schools",
    },
    {
      icon: FiUsers,
      title: "Teachers",
      path: "/publisher/teachers",
      dataTour: "sidebar-teachers",
    },
  ],
  teacher: [
    {
      icon: FiHome,
      title: "Dashboard",
      path: "/teacher/dashboard",
      dataTour: "sidebar-dashboard",
    },
    {
      icon: FiCalendar,
      title: "Calendar",
      path: "/teacher/calendar",
    },
    {
      icon: FiBook,
      title: "Library",
      path: "/teacher/books",
      dataTour: "sidebar-library",
    },
    {
      icon: FiFolder,
      title: "My Materials",
      path: "/teacher/materials",
      dataTour: "sidebar-materials",
    },
    {
      icon: FiTrendingUp,
      title: "Classrooms",
      path: "/teacher/classrooms",
    },
    {
      icon: FiUsers,
      title: "Students",
      path: "/teacher/students",
      dataTour: "sidebar-students",
    },
    {
      icon: FiClipboard,
      title: "Assignments",
      path: "/teacher/assignments",
      dataTour: "sidebar-assignments",
    },
    {
      icon: FiBarChart2,
      title: "Reports",
      path: "/teacher/reports",
    },
  ],
  student: [
    {
      icon: FiHome,
      title: "Dashboard",
      path: "/student/dashboard",
      dataTour: "sidebar-dashboard",
    },
    {
      icon: FiCalendar,
      title: "Calendar",
      path: "/student/calendar",
    },
    {
      icon: FiClipboard,
      title: "Assignments",
      path: "/student/assignments",
      dataTour: "sidebar-assignments",
    },
    {
      icon: FiTrendingUp,
      title: "My Progress",
      path: "/student/progress",
      dataTour: "sidebar-progress",
    },
    {
      icon: FiBarChart2,
      title: "Reports",
      path: "/student/reports",
    },
  ],
}

const SidebarItems = ({ onClose, isCollapsed = false }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const location = useLocation()

  const userRole = (currentUser?.role || "student") as UserRole
  const menuItems = roleMenuItems[userRole] || roleMenuItems.student

  // Fetch real stats for admin users
  // TODO: Re-enable when AdminService.getDashboardStats is implemented
  const adminStats = undefined as AdminStats | undefined
  // const { data: adminStats } = useQuery({
  //   queryKey: ["adminStats"],
  //   queryFn: () => AdminService.getDashboardStats(),
  //   enabled: userRole === "admin",
  // })

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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Count incomplete student assignments (not_started + in_progress + past_due)
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
        return null // Books not tracked in stats
      case "/admin/students":
        return adminStats?.total_students ?? null
      case "/admin/assignments":
        return null // Assignments not tracked in stats
      case "/publisher/library":
        return null // Will be implemented later
      case "/publisher/schools":
        return null // Will be implemented later
      case "/publisher/teachers":
        return null // Will be implemented later
      case "/student/assignments":
        return incompleteAssignmentsCount > 0
          ? incompleteAssignmentsCount
          : null
      default:
        return null
    }
  }

  const renderMenuItem = (item: Item) => {
    const { icon: IconComponent, title, path, comingSoon, dataTour } = item
    const isActive = location.pathname === path
    const itemCount = getItemCount(path)

    const content = (
      <div
        className={`flex items-center text-sm transition-colors relative ${
          isCollapsed ? "justify-center px-2 py-3" : "gap-4 px-4 py-2"
        } ${
          isActive
            ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-r-4 border-teal-500"
            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        } ${comingSoon ? "opacity-60" : ""}`}
        title={isCollapsed ? title : undefined}
        data-tour={dataTour}
      >
        <IconComponent
          className={`self-center h-5 w-5 ${isActive ? "text-teal-600 dark:text-teal-400" : ""} ${
            isCollapsed ? "mx-auto" : ""
          }`}
        />
        {!isCollapsed && (
          <>
            <span className={`ml-2 flex-1 ${isActive ? "font-semibold" : ""}`}>
              {title}
            </span>
            {itemCount !== null && !comingSoon && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  path === "/student/assignments"
                    ? "bg-red-500 text-white font-semibold"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                {itemCount}
              </span>
            )}
            {comingSoon && (
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                Soon
              </span>
            )}
          </>
        )}
        {/* Show notification dot when collapsed and has count */}
        {isCollapsed && itemCount !== null && !comingSoon && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </div>
    )

    if (comingSoon) {
      return (
        <div key={title} className="cursor-not-allowed">
          {content}
        </div>
      )
    }

    return (
      <RouterLink key={title} to={path} onClick={onClose}>
        {content}
      </RouterLink>
    )
  }

  const bottomItems: Item[] = [
    {
      icon: FiSettings,
      title: "Settings",
      path: "/settings",
      dataTour: "sidebar-settings",
    },
  ]

  // Add User Management for admins only
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
          className={`border-b border-gray-200 dark:border-gray-700 ${
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

      {!isCollapsed && (
        <p className="text-xs px-4 py-2 font-bold text-gray-500 dark:text-gray-400">
          Menu
        </p>
      )}
      <div className="flex-1">{menuItems.map(renderMenuItem)}</div>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 mt-auto">
        {bottomItems.map(renderMenuItem)}
      </div>
    </>
  )
}

export default SidebarItems
