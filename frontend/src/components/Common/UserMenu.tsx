import { Link } from "@tanstack/react-router"
import { ChevronDown, LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useAuth from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

// Helper to get role display info
function getRoleInfo(role: string) {
  const roleMap: Record<string, { label: string; color: string }> = {
    admin: { label: "Administrator", color: "text-red-500" },
    supervisor: { label: "Supervisor", color: "text-orange-500" },
    publisher: { label: "Publisher", color: "text-purple-500" },
    teacher: { label: "Teacher", color: "text-blue-500" },
    student: { label: "Student", color: "text-primary" },
  }
  return roleMap[role] || { label: role, color: "text-muted-foreground" }
}

const UserMenu = () => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    logout()
  }

  const roleInfo = getRoleInfo(user?.role || "")
  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          data-testid="user-menu"
          className="relative h-10 gap-2 pl-2 pr-3 rounded-full hover:bg-accent/80 active:scale-95 transition-all"
        >
          <Avatar className="h-7 w-7 border border-border">
            <AvatarImage src={user?.avatar_url || undefined} alt={user?.full_name || "User"} />
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline-block max-w-[120px] truncate text-sm font-medium">
            {user?.full_name || "User"}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="end" sideOffset={8}>
        {/* User Info Header */}
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-border">
              <AvatarImage src={user?.avatar_url || undefined} alt={user?.full_name || "User"} />
              <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-0.5 overflow-hidden">
              <p className="text-sm font-medium leading-none truncate">{user?.full_name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
              <p className={cn("text-xs font-medium", roleInfo.color)}>
                {roleInfo.label}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-3 cursor-pointer py-2.5 px-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>My Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-3 cursor-pointer py-2.5 px-3 text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserMenu
