/**
 * Sound Settings Component
 * Allows users to configure sound effect preferences
 */

import { Volume2, VolumeOff, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useSoundContext, type SoundType } from "@/hooks/useSoundEffects"

/**
 * Sound preview button
 */
function SoundPreviewButton({
  type,
  label,
  onPlay,
  disabled,
}: {
  type: SoundType
  label: string
  onPlay: (type: SoundType) => void
  disabled: boolean
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPlay(type)}
      disabled={disabled}
      className="text-xs"
    >
      {label}
    </Button>
  )
}

/**
 * Main sound settings component
 */
const SoundSettings = () => {
  const { isEnabled, volume, play, setEnabled, setVolume } = useSoundContext()

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
  }

  const handlePreview = (type: SoundType) => {
    // Temporarily enable to preview
    if (!isEnabled) {
      play(type)
    } else {
      play(type)
    }
  }

  const VolumeIcon = !isEnabled ? VolumeOff : volume === 0 ? VolumeX : Volume2

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Sound Effects</h3>
        <p className="text-sm text-muted-foreground">
          Configure audio feedback for learning interactions
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between py-4 border-b border-border/50">
        <div className="flex-1 pr-4">
          <Label htmlFor="sound-enabled" className="text-sm font-medium cursor-pointer">
            Enable Sound Effects
          </Label>
          <p className="text-sm text-muted-foreground mt-0.5">
            Play audio cues during activities and interactions
          </p>
        </div>
        <Switch id="sound-enabled" checked={isEnabled} onCheckedChange={setEnabled} />
      </div>

      {/* Volume Slider */}
      <div className={`space-y-4 ${!isEnabled ? "opacity-50" : ""}`}>
        <div className="flex items-center gap-3">
          <VolumeIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <Label className="text-sm font-medium">Volume</Label>
            <p className="text-sm text-muted-foreground">Adjust sound effect volume</p>
          </div>
          <span className="text-sm font-mono text-muted-foreground w-12 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
        <Slider
          value={[volume]}
          onValueChange={handleVolumeChange}
          min={0}
          max={1}
          step={0.1}
          disabled={!isEnabled}
          className="w-full"
        />
      </div>

      {/* Sound Descriptions */}
      <div className={`space-y-4 ${!isEnabled ? "opacity-50" : ""}`}>
        <h4 className="text-sm font-medium text-foreground">Sound Types</h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <div>
              <span className="font-medium">Correct Answer</span>
              <p className="text-muted-foreground text-xs">Plays when you answer correctly</p>
            </div>
            <SoundPreviewButton
              type="correct"
              label="Preview"
              onPlay={handlePreview}
              disabled={!isEnabled}
            />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <div>
              <span className="font-medium">Incorrect Answer</span>
              <p className="text-muted-foreground text-xs">Gentle feedback for wrong answers</p>
            </div>
            <SoundPreviewButton
              type="incorrect"
              label="Preview"
              onPlay={handlePreview}
              disabled={!isEnabled}
            />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <div>
              <span className="font-medium">Drag & Drop</span>
              <p className="text-muted-foreground text-xs">
                Audio cue when dragging and dropping items
              </p>
            </div>
            <div className="flex gap-2">
              <SoundPreviewButton
                type="drag"
                label="Drag"
                onPlay={handlePreview}
                disabled={!isEnabled}
              />
              <SoundPreviewButton
                type="drop"
                label="Drop"
                onPlay={handlePreview}
                disabled={!isEnabled}
              />
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <div>
              <span className="font-medium">Book Open</span>
              <p className="text-muted-foreground text-xs">Sound when opening a book</p>
            </div>
            <SoundPreviewButton
              type="bookOpen"
              label="Preview"
              onPlay={handlePreview}
              disabled={!isEnabled}
            />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <div>
              <span className="font-medium">Activity Start</span>
              <p className="text-muted-foreground text-xs">Sound when starting an activity</p>
            </div>
            <SoundPreviewButton
              type="activityStart"
              label="Preview"
              onPlay={handlePreview}
              disabled={!isEnabled}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="font-medium">Completion</span>
              <p className="text-muted-foreground text-xs">Celebration sound when finishing</p>
            </div>
            <SoundPreviewButton
              type="complete"
              label="Preview"
              onPlay={handlePreview}
              disabled={!isEnabled}
            />
          </div>
        </div>
      </div>

      {/* Info Note */}
      <p className="text-xs text-muted-foreground italic">
        Sound effects help reinforce learning through audio feedback. They can be especially helpful
        for younger learners.
      </p>
    </div>
  )
}

export default SoundSettings
