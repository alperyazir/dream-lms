import { createFileRoute } from "@tanstack/react-router"
import {
  Bell,
  Image,
  Lock,
  Mail,
  Palette,
  Shield,
  User,
} from "lucide-react"
import { FiSettings } from "react-icons/fi"
import Appearance from "@/components/UserSettings/Appearance"
import AvatarSelection from "@/components/UserSettings/AvatarSelection"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import NotificationSettings from "@/components/UserSettings/NotificationSettings"
import UserInformation from "@/components/UserSettings/UserInformation"
import { PageContainer, PageHeader } from "@/components/Common/PageContainer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useAuth from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

// Story 14.3 AC 34-39: Removed Danger Zone / Delete Account from all profiles
// No user can self-delete through UI - account deletion is handled by admins only
const tabsConfig = [
  {
    value: "my-profile",
    title: "Profile",
    icon: User,
    component: UserInformation,
  },
  {
    value: "avatar",
    title: "Avatar",
    icon: Image,
    component: AvatarSelection,
  },
  {
    value: "password",
    title: "Password",
    icon: Lock,
    component: ChangePassword,
  },
  {
    value: "notifications",
    title: "Notifications",
    icon: Bell,
    component: NotificationSettings,
  },
  {
    value: "appearance",
    title: "Appearance",
    icon: Palette,
    component: Appearance,
  },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

// Helper to get role display info
function getRoleInfo(role: string) {
  const roleMap: Record<string, { label: string; color: string }> = {
    admin: { label: "Administrator", color: "bg-red-500/10 text-red-500 border-red-500/20" },
    supervisor: { label: "Supervisor", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
    publisher: { label: "Publisher", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
    teacher: { label: "Teacher", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    student: { label: "Student", color: "bg-primary/10 text-primary border-primary/20" },
  }
  return roleMap[role] || { label: role, color: "bg-muted text-muted-foreground" }
}

function UserSettings() {
  const { user: currentUser } = useAuth()

  if (!currentUser) {
    return null
  }

  // Story 28.1: Filter out password tab for students - teachers manage their passwords
  const filteredTabs = tabsConfig.filter((tab) => {
    if (tab.value === "password" && currentUser.role === "student") {
      return false
    }
    return true
  })

  const roleInfo = getRoleInfo(currentUser.role || "student")
  const initials = currentUser.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  return (
    <PageContainer>
      <PageHeader
        icon={FiSettings}
        title="Settings"
        description="Manage your account settings and preferences"
      />

      {/* Profile Summary Card */}
      <Card className="border-border/50 bg-gradient-to-r from-card to-card/80">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                <AvatarImage src={currentUser.avatar_url || undefined} alt={currentUser.full_name || "User"} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-background border-2 border-border">
                <Shield className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground">
                {currentUser.full_name || "User"}
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{currentUser.email}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs font-medium", roleInfo.color)}
                >
                  {roleInfo.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="my-profile" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-card/50 p-1 h-auto flex-wrap">
          {filteredTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {filteredTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <tab.component />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  )
}
