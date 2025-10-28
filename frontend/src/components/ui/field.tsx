import * as React from "react"
import { Label } from "./label"

export interface FieldProps {
  label?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  function Field({ label, error, required, children, className }, ref) {
    return (
      <div ref={ref} className={`space-y-2 ${className || ""}`}>
        {label && (
          <Label>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        {children}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
