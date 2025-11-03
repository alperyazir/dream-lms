import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink, useLocation } from "@tanstack/react-router"
import {
  FiBarChart2,
  FiBook,
  FiBriefcase,
  FiCalendar,
  FiClipboard,
  FiHome,
  FiSettings,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic, UserRole } from "@/client"
import {
  adminDashboardData,
  mockAssignments,
  mockBooks,
  mockStudents,
  publisherDashboardData,
} from "@/lib/mockData"

interface SidebarItemsProps {
  onClose?: () => void
}

interface Item {
  icon: IconType
  title: string
  path: string
  comingSoon?: boolean
}

// Role-specific menu items
const roleMenuItems: Record<UserRole, Item[]> = {
  admin: [
    { icon: FiHome, title: "Dashboard", path: "/admin/dashboard" },
    { icon: FiBriefcase, title: "Publishers", path: "/admin/publishers" },
    { icon: FiTrendingUp, title: "Schools", path: "/admin/schools" },
    { icon: FiUsers, title: "Teachers", path: "/admin/teachers" },
    { icon: FiBook, title: "Books", path: "/admin/books" },
    { icon: FiUsers, title: "Students", path: "/admin/students" },
    { icon: FiClipboard, title: "Assignments", path: "/admin/assignments" },
  ],
  publisher: [
    { icon: FiHome, title: "Dashboard", path: "/publisher/dashboard" },
    {
      icon: FiBook,
      title: "Library",
      path: "/publisher/library",
    },
    {
      icon: FiTrendingUp,
      title: "Schools",
      path: "/publisher/schools",
    },
    {
      icon: FiUsers,
      title: "Teachers",
      path: "/publisher/teachers",
    },
  ],
  teacher: [
    { icon: FiHome, title: "Dashboard", path: "/teacher/dashboard" },
    {
      icon: FiCalendar,
      title: "Calendar",
      path: "/teacher/calendar",
      comingSoon: true,
    },
    { icon: FiBook, title: "Library", path: "/teacher/books" },
    {
      icon: FiTrendingUp,
      title: "Classrooms",
      path: "/teacher/classrooms",
      comingSoon: true,
    },
    {
      icon: FiUsers,
      title: "Students",
      path: "/teacher/students",
      comingSoon: true,
    },
    { icon: FiClipboard, title: "Assignments", path: "/teacher/assignments" },
    {
      icon: FiBarChart2,
      title: "Reports",
      path: "/teacher/reports",
      comingSoon: true,
    },
  ],
  student: [
    { icon: FiHome, title: "Dashboard", path: "/student/dashboard" },
    {
      icon: FiCalendar,
      title: "Calendar",
      path: "/student/calendar",
      comingSoon: true,
    },
    { icon: FiClipboard, title: "Assignments", path: "/student/assignments" },
    {
      icon: FiBarChart2,
      title: "Reports",
      path: "/student/reports",
      comingSoon: true,
    },
  ],
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const location = useLocation()

  const userRole = (currentUser?.role || "student") as UserRole
  const menuItems = roleMenuItems[userRole] || roleMenuItems.student

  // Get count for each path
  const getItemCount = (path: string): number | null => {
    switch (path) {
      case "/admin/publishers":
        return adminDashboardData.publishers.length
      case "/admin/schools":
        return adminDashboardData.schools.length
      case "/admin/teachers":
        return adminDashboardData.teachers.length
      case "/admin/books":
        return mockBooks.length
      case "/admin/students":
        return mockStudents.length
      case "/admin/assignments":
        return mockAssignments.length
      case "/publisher/library":
        return publisherDashboardData.books.length
      case "/publisher/schools":
        return publisherDashboardData.schools.length
      case "/publisher/teachers":
        return adminDashboardData.teachers.length
      default:
        return null
    }
  }

  const renderMenuItem = (item: Item) => {
    const { icon: IconComponent, title, path, comingSoon } = item
    const isActive = location.pathname === path
    const itemCount = getItemCount(path)

    const content = (
      <div
        className={`flex gap-4 px-4 py-2 items-center text-sm transition-colors ${
          isActive
            ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-r-4 border-teal-500"
            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        } ${comingSoon ? "opacity-60" : ""}`}
      >
        <IconComponent
          className={`self-center h-5 w-5 ${isActive ? "text-teal-600 dark:text-teal-400" : ""}`}
        />
        <span className={`ml-2 flex-1 ${isActive ? "font-semibold" : ""}`}>
          {title}
        </span>
        {itemCount !== null && !comingSoon && (
          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
            {itemCount}
          </span>
        )}
        {comingSoon && (
          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
            Soon
          </span>
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
    { icon: FiSettings, title: "Settings", path: "/settings" },
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
      <p className="text-xs px-4 py-2 font-bold text-gray-500 dark:text-gray-400">
        Menu
      </p>
      <div className="flex-1">{menuItems.map(renderMenuItem)}</div>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 mt-auto">
        {bottomItems.map(renderMenuItem)}
      </div>
    </>
  )
}

export default SidebarItems
