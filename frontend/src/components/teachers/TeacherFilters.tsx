import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface TeacherFilters {
  search: string
  school: string
}

interface TeacherFiltersProps {
  filters: TeacherFilters
  onChange: (filters: TeacherFilters) => void
  schools: { id: string; name: string }[]
}

export function TeacherFilters({
  filters,
  onChange,
  schools,
}: TeacherFiltersProps) {
  const hasActiveFilters = filters.search || filters.school

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teachers..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.school || "all"}
        onValueChange={(v) =>
          onChange({ ...filters, school: v === "all" ? "" : v })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Schools" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Schools</SelectItem>
          {schools.map((school) => (
            <SelectItem key={school.id} value={school.id}>
              {school.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ search: "", school: "" })}
        >
          Clear
        </Button>
      )}
    </div>
  )
}
