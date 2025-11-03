import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { mockClasses, type Material } from "@/lib/mockData"

export interface ShareMaterialDialogProps {
  material: Material | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onShare: (materialId: string, selectedClasses: string[]) => void
}

/**
 * Share Material Dialog Component
 * Allows sharing materials with classes using checkboxes
 */
export const ShareMaterialDialog = React.memo(
  ({
    material,
    open,
    onOpenChange,
    onShare,
  }: ShareMaterialDialogProps) => {
    const [selectedClasses, setSelectedClasses] = useState<string[]>(
      material?.shared_with || [],
    )

    // Update selected classes when material changes
    React.useEffect(() => {
      setSelectedClasses(material?.shared_with || [])
    }, [material])

    // Handle checkbox change
    const handleClassToggle = (classId: string) => {
      setSelectedClasses((prev) =>
        prev.includes(classId)
          ? prev.filter((id) => id !== classId)
          : [...prev, classId],
      )
    }

    // Handle share
    const handleShare = () => {
      if (material) {
        onShare(material.id, selectedClasses)
        onOpenChange(false)
      }
    }

    if (!material) return null

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Material</DialogTitle>
            <DialogDescription>
              Select which classes should have access to "{material.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {mockClasses.map((cls) => (
              <div key={cls.id} className="flex items-center space-x-3">
                <Checkbox
                  id={`class-${cls.id}`}
                  checked={selectedClasses.includes(cls.id)}
                  onCheckedChange={() => handleClassToggle(cls.id)}
                />
                <Label
                  htmlFor={`class-${cls.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-medium">{cls.name}</div>
                  <div className="text-sm text-gray-500">
                    {cls.studentCount} students
                  </div>
                </Label>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  },
)

ShareMaterialDialog.displayName = "ShareMaterialDialog"
