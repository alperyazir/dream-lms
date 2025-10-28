import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink, useLocation } from "@tanstack/react-router"
import { FiHome, FiSettings, FiUsers } from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic, UserRole } from "@/client"

interface SidebarItemsProps {
  onClose?: () => void
}

interface Item {
  icon: IconType
  title: string
  path: string
}

// Map role to dashboard route
const roleDashboards: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  publisher: "/publisher/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const location = useLocation()

  // Build menu items
  const menuItems: Item[] = []

  // Add Dashboard as first item for all users
  const userRole = (currentUser?.role || "student") as UserRole
  const dashboardPath = roleDashboards[userRole]
  menuItems.push({ icon: FiHome, title: "Dashboard", path: dashboardPath })

  // Add User Settings for all users
  menuItems.push({
    icon: FiSettings,
    title: "User Settings",
    path: "/settings",
  })

  // Add User Management page only for superusers
  if (currentUser?.is_superuser) {
    menuItems.push({
      icon: FiUsers,
      title: "User Management",
      path: "/admin/users",
    })
  }

  const listItems = menuItems.map(({ icon: IconComponent, title, path }) => {
    const isActive = location.pathname === path

    return (
      <RouterLink key={title} to={path} onClick={onClose}>
        <div
          className={`flex gap-4 px-4 py-2 items-center text-sm transition-colors ${
            isActive
              ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-r-4 border-teal-500"
              : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          }`}
        >
          <IconComponent
            className={`self-center h-5 w-5 ${isActive ? "text-teal-600 dark:text-teal-400" : ""}`}
          />
          <span className={`ml-2 ${isActive ? "font-semibold" : ""}`}>
            {title}
          </span>
        </div>
      </RouterLink>
    )
  })

  return (
    <>
      <p className="text-xs px-4 py-2 font-bold">Menu</p>
      <div>{listItems}</div>
    </>
  )
}

export default SidebarItems
