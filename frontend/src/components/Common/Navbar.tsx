import { Link } from "@tanstack/react-router"
import { FiMail } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { ColorModeButton } from "@/components/ui/color-mode"
import { NotificationBell } from "@/components/notifications"
import { useMessagesUnreadCount } from "@/hooks/useMessages"
import Logo from "/assets/images/dreamedtech_single.svg"

import UserMenu from "./UserMenu"

function Navbar() {
  // Fetch unread messages count from API
  const { count: totalUnreadMessages } = useMessagesUnreadCount()

  return (
    <>
      {/* Desktop Navbar */}
      <div className="hidden md:flex justify-between sticky top-0 items-center bg-muted w-full p-4 z-10">
        <Link to="/" className="flex items-center gap-3">
          <img src={Logo} alt="DreamEdTech" className="h-10 w-10" />
          <h1 className="text-2xl font-bold text-foreground">Dream LMS</h1>
        </Link>
        <div className="flex gap-2 items-center">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Messages Icon with Unread Count */}
          <Link to="/messaging">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Messages ${totalUnreadMessages > 0 ? `(${totalUnreadMessages} unread)` : ""}`}
              className="relative"
            >
              <FiMail fontSize="20" />
              {totalUnreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
                  {totalUnreadMessages}
                </span>
              )}
            </Button>
          </Link>

          {/* Dark Mode Toggle */}
          <ColorModeButton />

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>

      {/* Mobile Navbar */}
      <div className="flex md:hidden justify-between sticky top-0 items-center bg-muted w-full p-3 z-10">
        <Link to="/" className="flex items-center gap-2">
          <img src={Logo} alt="DreamEdTech" className="h-8 w-8" />
          <h1 className="text-xl font-bold text-foreground">Dream LMS</h1>
        </Link>
        <div className="flex gap-1 items-center">
          {/* Notification Bell */}
          <NotificationBell size="sm" />

          {/* Messages Icon with Unread Count */}
          <Link to="/messaging">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Messages ${totalUnreadMessages > 0 ? `(${totalUnreadMessages} unread)` : ""}`}
              className="relative h-9 w-9"
            >
              <FiMail fontSize="18" />
              {totalUnreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white">
                  {totalUnreadMessages}
                </span>
              )}
            </Button>
          </Link>

          {/* Dark Mode Toggle */}
          <ColorModeButton />

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </>
  )
}

export default Navbar
