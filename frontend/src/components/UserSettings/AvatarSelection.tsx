import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, RefreshCw, Sparkles, Trash2, User } from "lucide-react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { avatarsApi } from "@/services/avatarsApi"

// DiceBear styles with display names
const DICEBEAR_STYLES = [
  { id: "adventurer", name: "Adventurer", description: "Cute illustrated characters" },
  { id: "avataaars", name: "Avataaars", description: "Cartoon-style people" },
  { id: "lorelei", name: "Lorelei", description: "Stylish portraits" },
  { id: "notionists", name: "Notionists", description: "Notion-style avatars" },
  { id: "fun-emoji", name: "Fun Emoji", description: "Expressive emoji faces" },
  { id: "bottts", name: "Bottts", description: "Friendly robots" },
  { id: "pixel-art", name: "Pixel Art", description: "Retro pixel style" },
  { id: "thumbs", name: "Thumbs", description: "Hand-drawn thumbs" },
  { id: "big-smile", name: "Big Smile", description: "Happy smiling faces" },
  { id: "micah", name: "Micah", description: "Modern illustrated" },
  { id: "open-peeps", name: "Open Peeps", description: "Hand-drawn people" },
  { id: "personas", name: "Personas", description: "Diverse characters" },
  { id: "miniavs", name: "Miniavs", description: "Minimal avatars" },
  { id: "identicon", name: "Identicon", description: "Geometric patterns" },
  { id: "shapes", name: "Shapes", description: "Abstract shapes" },
  { id: "rings", name: "Rings", description: "Colorful rings" },
] as const

// Generate DiceBear URL
const getDiceBearUrl = (style: string, seed: string) => {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=128`
}

// Generate random seeds for avatar grid
const generateSeeds = (count: number, prefix: string) => {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}-${Date.now()}`)
}

const AvatarSelection = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { user: currentUser } = useAuth()

  const [selectedStyle, setSelectedStyle] = useState<string>("adventurer")
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [randomSeed, setRandomSeed] = useState(Date.now())

  // Generate seeds for current style
  const avatarSeeds = useMemo(() => {
    return generateSeeds(24, `${selectedStyle}-${randomSeed}`)
  }, [selectedStyle, randomSeed])

  // Select avatar mutation - save DiceBear URL
  const selectMutation = useMutation({
    mutationFn: (avatarUrl: string) =>
      avatarsApi.setAvatarUrl({ avatar_url: avatarUrl }),
    onSuccess: () => {
      showSuccessToast("Avatar updated successfully!")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      setSelectedAvatar(null)
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

  const handleStyleChange = (styleId: string) => {
    setSelectedStyle(styleId)
    setSelectedAvatar(null)
  }

  const handleAvatarSelect = (seed: string) => {
    const url = getDiceBearUrl(selectedStyle, seed)
    setSelectedAvatar(url)
  }

  const handleConfirmSelection = () => {
    if (selectedAvatar) {
      selectMutation.mutate(selectedAvatar)
    }
  }

  const handleRemoveAvatar = () => {
    removeMutation.mutate()
  }

  const handleRefresh = () => {
    setRandomSeed(Date.now())
    setSelectedAvatar(null)
  }

  const isProcessing = selectMutation.isPending || removeMutation.isPending
  const currentAvatarUrl = currentUser?.avatar_url
  const currentStyleInfo = DICEBEAR_STYLES.find(s => s.id === selectedStyle)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Profile Avatar</h3>
        <p className="text-sm text-muted-foreground">
          Choose from thousands of unique avatars powered by DiceBear
        </p>
      </div>

      {/* Current Avatar Preview */}
      <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
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
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-green-500 border-2 border-background">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">Current Avatar</p>
          <p className="text-sm text-muted-foreground">
            {currentAvatarUrl ? "Looking good!" : "No avatar selected"}
          </p>
          {currentAvatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveAvatar}
              disabled={isProcessing}
              className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Avatar
            </Button>
          )}
        </div>

        {/* Preview of selected avatar */}
        {selectedAvatar && (
          <div className="flex items-center gap-4 pl-4 border-l border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-lg ring-2 ring-primary/20">
                <img
                  src={selectedAvatar}
                  alt="Selected avatar preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Style Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Choose a style</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isProcessing}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh avatars
          </Button>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-3">
            {DICEBEAR_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => handleStyleChange(style.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  "border-2 hover:border-primary/50",
                  selectedStyle === style.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-accent"
                )}
              >
                {style.name}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {currentStyleInfo && (
          <p className="text-xs text-muted-foreground">
            {currentStyleInfo.description}
          </p>
        )}
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {avatarSeeds.map((seed) => {
          const avatarUrl = getDiceBearUrl(selectedStyle, seed)
          const isSelected = selectedAvatar === avatarUrl

          return (
            <button
              key={seed}
              type="button"
              onClick={() => handleAvatarSelect(seed)}
              disabled={isProcessing}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-card",
                "hover:scale-105 hover:border-primary hover:shadow-lg",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                isSelected
                  ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-lg"
                  : "border-border/50",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              <img
                src={avatarUrl}
                alt={`Avatar option`}
                className="w-full h-full object-cover p-1"
                loading="lazy"
              />
              {isSelected && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <div className="p-1 rounded-full bg-primary">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Confirm Selection Button */}
      {selectedAvatar && (
        <div className="flex gap-3 pt-2 sticky bottom-0 bg-card py-4 border-t border-border/50 -mx-6 px-6">
          <Button
            onClick={handleConfirmSelection}
            disabled={isProcessing}
            className="flex-1 sm:flex-none"
          >
            {selectMutation.isPending ? "Saving..." : "Use This Avatar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedAvatar(null)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

export default AvatarSelection
