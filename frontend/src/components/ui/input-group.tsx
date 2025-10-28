import * as React from "react"

export interface InputGroupProps {
  children: React.ReactNode
  className?: string
}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  function InputGroup({ children, className }, ref) {
    return (
      <div ref={ref} className={`relative flex items-center ${className || ""}`}>
        {children}
      </div>
    )
  }
)

export interface InputElementProps {
  children: React.ReactNode
  placement?: "left" | "right"
  className?: string
}

export const InputElement = ({ children, placement = "left", className }: InputElementProps) => {
  const baseClasses = "absolute flex items-center justify-center pointer-events-none text-muted-foreground"
  const placementClasses = placement === "left" ? "left-3" : "right-3"

  return (
    <div className={`${baseClasses} ${placementClasses} ${className || ""}`}>
      {children}
    </div>
  )
}
