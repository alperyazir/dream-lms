import * as React from "react"
import { Button, type ButtonProps } from "./button"

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  icon?: React.ReactNode
  "aria-label": string
  size?: ButtonProps["size"]
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ icon, children, size = "icon", ...props }, ref) {
    return (
      <Button ref={ref} size={size} {...props}>
        {icon || children}
      </Button>
    )
  }
)
