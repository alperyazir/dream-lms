import { createFileRoute } from "@tanstack/react-router"
import Appearance from "@/components/UserSettings/Appearance"
import AvatarSelection from "@/components/UserSettings/AvatarSelection"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import NotificationSettings from "@/components/UserSettings/NotificationSettings"
import UserInformation from "@/components/UserSettings/UserInformation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useAuth from "@/hooks/useAuth"

// Story 14.3 AC 34-39: Removed Danger Zone / Delete Account from all profiles
// No user can self-delete through UI - account deletion is handled by admins only
const tabsConfig = [
  { value: "my-profile", title: "My profile", component: UserInformation },
  { value: "avatar", title: "Avatar", component: AvatarSelection },
  { value: "password", title: "Password", component: ChangePassword },
  {
    value: "notifications",
    title: "Notifications",
    component: NotificationSettings,
  },
  { value: "appearance", title: "Appearance", component: Appearance },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

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

  return (
    <div className="max-w-full">
      <h1 className="text-2xl font-bold text-center md:text-left py-12">
        User Settings
      </h1>

      <Tabs defaultValue="my-profile">
        <TabsList>
          {filteredTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {filteredTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
