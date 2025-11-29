import { Button } from "@/components/ui/button"
import { useNavigation } from "@/contexts/NavigationContext"
import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  const { isSidebarCollapsed, toggleSidebar } = useNavigation()

  return (
    <div
      className={`hidden md:flex flex-col sticky top-0 bg-subtle h-screen shadow-neuro transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? "w-16" : "min-w-xs"
      }`}
    >
      {/* Collapse/Expand Button - Top */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={
            isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            // >> icon (expand)
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          ) : (
            // << icon (collapse)
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          )}
        </Button>
      </div>

      <div className="flex flex-col flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <SidebarItems isCollapsed={isSidebarCollapsed} />
      </div>
    </div>
  )
}

export default Sidebar
