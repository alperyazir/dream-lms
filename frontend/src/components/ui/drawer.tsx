import * as React from "react"
import { Sheet, SheetContent, SheetTrigger } from "./sheet"

// Drawer is just a Sheet with different positioning
export const DrawerRoot = Sheet
export const DrawerTrigger = SheetTrigger
export const DrawerContent = SheetContent
export const DrawerBackdrop = ({ ...props }) => null // Sheet handles overlay internally

export const DrawerBody = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="p-4" {...props}>{children}</div>
)

export const DrawerHeader = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="border-b pb-4 mb-4" {...props}>{children}</div>
)

export const DrawerFooter = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="border-t pt-4 mt-4" {...props}>{children}</div>
)

export const DrawerTitle = ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className="text-lg font-semibold" {...props}>{children}</h2>
)

export const DrawerCloseTrigger = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className="absolute right-4 top-4" {...props}>{children}</button>
)
