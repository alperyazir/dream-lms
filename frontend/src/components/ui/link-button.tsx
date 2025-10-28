import * as React from "react"
import { Button, type ButtonProps } from "./button"

export interface LinkButtonProps extends ButtonProps {
  href: string
}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  function LinkButton({ href, ...props }, ref) {
    return (
      <a href={href} ref={ref}>
        <Button {...props} />
      </a>
    )
  }
)
