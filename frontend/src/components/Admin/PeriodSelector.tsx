import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface PeriodSelectorProps {
  value: string
  onChange: (period: string) => void
}

const PERIODS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
]

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => {
        if (val) onChange(val)
      }}
      className="justify-start"
    >
      {PERIODS.map((p) => (
        <ToggleGroupItem
          key={p.value}
          value={p.value}
          aria-label={`Show ${p.label}`}
          className="data-[state=on]:bg-teal-500 data-[state=on]:text-white"
        >
          {p.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
