import * as React from "react"

export interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

const RadioGroupContext = React.createContext<{
  value?: string
  onChange: (value: string) => void
} | null>(null)

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  function RadioGroup({ value, onValueChange, children, className }, ref) {
    const handleChange = (newValue: string) => {
      onValueChange?.(newValue)
    }

    return (
      <RadioGroupContext.Provider value={{ value, onChange: handleChange }}>
        <div ref={ref} className={`space-y-2 ${className || ""}`}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    )
  }
)

export interface RadioProps {
  value: string
  children?: React.ReactNode
  className?: string
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  function Radio({ value, children, className }, ref) {
    const context = React.useContext(RadioGroupContext)

    if (!context) {
      throw new Error("Radio must be used within RadioGroup")
    }

    const { value: groupValue, onChange } = context
    const isChecked = groupValue === value

    return (
      <label className={`flex items-center gap-2 cursor-pointer ${className || ""}`}>
        <input
          ref={ref}
          type="radio"
          value={value}
          checked={isChecked}
          onChange={() => onChange(value)}
          className="h-4 w-4"
        />
        {children && <span>{children}</span>}
      </label>
    )
  }
)
