/**
 * Navigation Context - Manages sidebar collapse state
 */

import { createContext, type ReactNode, useContext, useState } from "react"

interface NavigationContextType {
  isSidebarCollapsed: boolean
  toggleSidebar: () => void
  collapseSidebar: () => void
  expandSidebar: () => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev)
  const collapseSidebar = () => setIsSidebarCollapsed(true)
  const expandSidebar = () => setIsSidebarCollapsed(false)

  return (
    <NavigationContext.Provider
      value={{
        isSidebarCollapsed,
        toggleSidebar,
        collapseSidebar,
        expandSidebar,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider")
  }
  return context
}
