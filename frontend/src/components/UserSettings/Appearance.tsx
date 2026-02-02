import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

const Appearance = () => {
  const { theme, setTheme } = useTheme()

  const themes = [
    {
      value: "system",
      label: "System",
      description: "Follow your device settings",
      icon: Monitor,
    },
    {
      value: "light",
      label: "Light",
      description: "Light background with dark text",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Dark",
      description: "Dark background with light text",
      icon: Moon,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Theme Preferences
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose how Dream LMS looks to you
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {themes.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTheme(t.value)}
            className={cn(
              "relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              theme === t.value
                ? "border-primary bg-primary/5"
                : "border-border bg-card",
            )}
          >
            <div
              className={cn(
                "p-3 rounded-full",
                theme === t.value ? "bg-primary/10" : "bg-muted",
              )}
            >
              <t.icon
                className={cn(
                  "h-6 w-6",
                  theme === t.value ? "text-primary" : "text-muted-foreground",
                )}
              />
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "font-medium",
                  theme === t.value ? "text-primary" : "text-foreground",
                )}
              >
                {t.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.description}
              </p>
            </div>
            {theme === t.value && (
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Appearance
