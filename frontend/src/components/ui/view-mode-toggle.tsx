import { LayoutGrid, List } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export type ViewMode = "grid" | "table"

interface ViewModeToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
}

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ViewMode)}
      className={cn("border rounded-md", className)}
    >
      <ToggleGroupItem
        value="grid"
        aria-label="Grid view"
        className="data-[state=on]:bg-accent"
      >
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="table"
        aria-label="Table view"
        className="data-[state=on]:bg-accent"
      >
        <List className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
