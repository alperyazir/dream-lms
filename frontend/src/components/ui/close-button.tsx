import * as React from "react"
import { LuX } from "react-icons/lu"
import { Button, type ButtonProps } from "./button"

export type CloseButtonProps = ButtonProps

export const CloseButton = React.forwardRef<
  HTMLButtonElement,
  CloseButtonProps
>(function CloseButton(props, ref) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Close"
      ref={ref}
      {...props}
    >
      {props.children ?? <LuX />}
    </Button>
  )
})
