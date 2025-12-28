import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AssignmentPublishStatus } from "@/types/assignment"
import type { Class } from "@/types/teacher"

export interface AssignmentFiltersState {
  search?: string
  class_id?: string
  status?: AssignmentPublishStatus | "all"
}

interface AssignmentFiltersProps {
  filters: AssignmentFiltersState
  onChange: (filters: AssignmentFiltersState) => void
  classes: Class[]
  resultCount: number
  totalCount: number
}

export function AssignmentFilters({
  filters,
  onChange,
  classes,
  resultCount,
  totalCount,
}: AssignmentFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.class_id ||
    (filters.status && filters.status !== "all")

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Input
        placeholder="Search assignments..."
        value={filters.search || ""}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-64"
      />

      <Select
        value={filters.class_id || "all"}
        onValueChange={(v) =>
          onChange({ ...filters, class_id: v === "all" ? undefined : v })
        }
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status || "all"}
        onValueChange={(v) =>
          onChange({
            ...filters,
            status: v === "all" ? undefined : (v as AssignmentPublishStatus),
          })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="published">Active</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}

      <span className="text-sm text-muted-foreground ml-auto">
        {resultCount === totalCount
          ? `${totalCount} ${totalCount === 1 ? "assignment" : "assignments"}`
          : `${resultCount} of ${totalCount}`}
      </span>
    </div>
  )
}
