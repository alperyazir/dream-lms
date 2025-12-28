import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ACTIVITY_TYPE_CONFIG } from "@/types/book"

export interface LibraryFiltersState {
  search: string
  publisher: string
  activityType: string
}

interface LibraryFiltersProps {
  filters: LibraryFiltersState
  onChange: (filters: LibraryFiltersState) => void
  publishers?: string[]
  showPublisherFilter?: boolean
  resultCount?: number
  totalCount?: number
}

const emptyFilters: LibraryFiltersState = {
  search: "",
  publisher: "",
  activityType: "",
}

export function LibraryFilters({
  filters,
  onChange,
  publishers = [],
  showPublisherFilter = true,
  resultCount,
  totalCount,
}: LibraryFiltersProps) {
  const hasActiveFilters =
    filters.search || filters.publisher || filters.activityType

  const handleClear = () => onChange(emptyFilters)

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search books..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Publisher Filter */}
      {showPublisherFilter && publishers.length > 0 && (
        <Select
          value={filters.publisher}
          onValueChange={(value) =>
            onChange({ ...filters, publisher: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Publishers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Publishers</SelectItem>
            {publishers.map((pub) => (
              <SelectItem key={pub} value={pub}>
                {pub}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Activity Type Filter */}
      <Select
        value={filters.activityType}
        onValueChange={(value) =>
          onChange({ ...filters, activityType: value === "all" ? "" : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Activities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Activity Types</SelectItem>
          {Object.entries(ACTIVITY_TYPE_CONFIG).map(([type, config]) => (
            <SelectItem key={type} value={type}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Button */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}

      {/* Result Count */}
      {resultCount !== undefined && totalCount !== undefined && (
        <span className="text-sm text-muted-foreground ml-auto">
          {resultCount === totalCount
            ? `${totalCount} books`
            : `${resultCount} of ${totalCount} books`}
        </span>
      )}
    </div>
  )
}
