/**
 * Date Range Filter Component
 */

import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { DateRange } from "@/types/ai-usage"

interface DateRangeFilterProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

type PresetOption = {
  label: string
  getValue: () => DateRange
}

const presets: PresetOption[] = [
  {
    label: "Today",
    getValue: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  {
    label: "Last 7 Days",
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 Days",
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  {
    label: "This Month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last Month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      }
    },
  },
  {
    label: "All Time",
    getValue: () => ({
      from: null,
      to: null,
    }),
  },
]

export function DateRangeFilter({
  dateRange,
  onDateRangeChange,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formatDateRange = () => {
    if (!dateRange.from && !dateRange.to) {
      return "All Time"
    }
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
    }
    if (dateRange.from) {
      return `From ${format(dateRange.from, "MMM d, yyyy")}`
    }
    if (dateRange.to) {
      return `Until ${format(dateRange.to, "MMM d, yyyy")}`
    }
    return "Select date range"
  }

  const handlePresetClick = (preset: PresetOption) => {
    onDateRangeChange(preset.getValue())
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !dateRange.from && !dateRange.to && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Preset buttons */}
          <div className="flex flex-col gap-1 border-r p-3">
            <div className="text-sm font-medium mb-2">Presets</div>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.from ?? undefined,
                to: dateRange.to ?? undefined,
              }}
              onSelect={(range) => {
                if (range) {
                  onDateRangeChange({
                    from: range.from ?? null,
                    to: range.to ?? null,
                  })
                }
              }}
              numberOfMonths={2}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
