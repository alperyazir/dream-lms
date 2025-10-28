import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import { FiHome, FiSettings, FiUsers } from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic } from "@/client"

const items = [
  { icon: FiHome, title: "Dashboard", path: "/" },
  { icon: FiSettings, title: "User Settings", path: "/settings" },
]

interface SidebarItemsProps {
  onClose?: () => void
}

interface Item {
  icon: IconType
  title: string
  path: string
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])

  const finalItems: Item[] = currentUser?.is_superuser
    ? [...items, { icon: FiUsers, title: "Admin", path: "/admin" }]
    : items

  const listItems = finalItems.map(({ icon: IconComponent, title, path }) => (
    <RouterLink key={title} to={path} onClick={onClose}>
      <div className="flex gap-4 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 items-center text-sm">
        <IconComponent className="self-center h-5 w-5" />
        <span className="ml-2">{title}</span>
      </div>
    </RouterLink>
  ))

  return (
    <>
      <p className="text-xs px-4 py-2 font-bold">
        Menu
      </p>
      <div>{listItems}</div>
    </>
  )
}

export default SidebarItems
