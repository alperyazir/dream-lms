import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu"

// Menu is an alias for DropdownMenu for compatibility
export const MenuRoot = DropdownMenu
export const MenuTrigger = DropdownMenuTrigger
export const MenuContent = DropdownMenuContent
export const MenuItem = DropdownMenuItem
export const MenuSeparator = DropdownMenuSeparator

export const MenuItemGroup = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props}>{children}</div>
)

export const MenuItemText = ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span {...props}>{children}</span>
)
