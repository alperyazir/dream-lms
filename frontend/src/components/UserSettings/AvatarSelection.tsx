import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Trash2, User } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { avatarsApi } from "@/services/avatarsApi"
import type { PredefinedAvatar } from "@/types/avatar"

const AvatarSelection = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { user: currentUser } = useAuth()
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null)

  // Fetch predefined avatars
  const { data: avatarsData, isLoading } = useQuery({
    queryKey: ["predefined-avatars"],
    queryFn: avatarsApi.getPredefinedAvatars,
  })

  // Select predefined avatar mutation
  const selectMutation = useMutation({
    mutationFn: (avatarId: string) =>
      avatarsApi.selectPredefinedAvatar({ avatar_id: avatarId }),
    onSuccess: () => {
      showSuccessToast("Avatar updated successfully.")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      setSelectedAvatarId(null)
    },
    onError: () => {
      showErrorToast("Failed to update avatar.")
    },
  })

  // Remove avatar mutation
  const removeMutation = useMutation({
    mutationFn: avatarsApi.removeAvatar,
    onSuccess: () => {
      showSuccessToast("Avatar removed successfully.")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: () => {
      showErrorToast("Failed to remove avatar.")
    },
  })

  const handleAvatarSelect = (avatar: PredefinedAvatar) => {
    setSelectedAvatarId(avatar.id)
  }

  const handleConfirmSelection = () => {
    if (selectedAvatarId) {
      selectMutation.mutate(selectedAvatarId)
    }
  }

  const handleRemoveAvatar = () => {
    removeMutation.mutate()
  }

  const isProcessing = selectMutation.isPending || removeMutation.isPending

  // Get current avatar URL for preview
  const currentAvatarUrl = currentUser?.avatar_url

  return (
    <div className="max-w-full">
      <h3 className="text-sm font-semibold py-4">Profile Avatar</h3>

      {/* Current Avatar Preview */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">Current Avatar</p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt="Current avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          {currentAvatarUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveAvatar}
              disabled={isProcessing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Predefined Avatars Grid */}
      <div>
        <p className="text-sm text-muted-foreground mb-3">Choose an avatar</p>
        {isLoading ? (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-full bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {avatarsData?.avatars.map((avatar) => {
              const isSelected = selectedAvatarId === avatar.id
              const isCurrent = currentAvatarUrl === avatar.url

              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => handleAvatarSelect(avatar)}
                  disabled={isProcessing}
                  className={cn(
                    "relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all",
                    "hover:scale-105 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    isSelected
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : isCurrent
                        ? "border-green-500"
                        : "border-transparent",
                    isProcessing && "opacity-50 cursor-not-allowed",
                  )}
                  title={avatar.name}
                >
                  <img
                    src={avatar.url}
                    alt={avatar.name}
                    className="w-full h-full object-cover"
                  />
                  {isCurrent && !isSelected && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-500" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Confirm Selection Button */}
        {selectedAvatarId && (
          <div className="mt-4">
            <Button
              onClick={handleConfirmSelection}
              disabled={isProcessing}
              size="sm"
            >
              {selectMutation.isPending ? "Saving..." : "Use This Avatar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAvatarId(null)}
              disabled={isProcessing}
              className="ml-2"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AvatarSelection
