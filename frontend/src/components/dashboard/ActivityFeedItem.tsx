import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

export interface ActivityFeedItemProps {
  user: string
  avatar: string
  action: string
  timestamp: string
}

export function ActivityFeedItem({
  user,
  avatar,
  action,
  timestamp,
}: ActivityFeedItemProps) {
  return (
    <Card className="shadow-neuro-sm border-gray-100 dark:border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 shadow-neuro-sm">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-sm font-medium">
              {avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold text-foreground">{user}</span>{" "}
              <span className="text-muted-foreground">{action}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
