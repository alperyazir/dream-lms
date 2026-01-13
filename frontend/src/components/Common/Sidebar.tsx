import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigation } from "@/contexts/NavigationContext"
import SidebarItems from "./SidebarItems"

const SIDEBAR_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 72

const Sidebar = () => {
  const { isSidebarCollapsed, toggleSidebar } = useNavigation()

  return (
    <motion.div
      className="hidden md:flex flex-col sticky top-0 h-screen bg-card/80 backdrop-blur-xl border-r border-border/50 relative z-40"
      initial={false}
      animate={{
        width: isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* Collapse/Expand Button - Floating on edge */}
      <motion.button
        onClick={toggleSidebar}
        className="absolute -right-3 top-7 z-50 w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isSidebarCollapsed ? (
            <motion.div
              key="expand"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.div>
          ) : (
            <motion.div
              key="collapse"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Scrollable Menu Content */}
      <div className="flex flex-col flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <SidebarItems isCollapsed={isSidebarCollapsed} />
      </div>
    </motion.div>
  )
}

export default Sidebar
