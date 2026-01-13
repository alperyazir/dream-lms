import { Link } from "@tanstack/react-router"
import { Mail } from "lucide-react"
import { NotificationBell } from "@/components/notifications"
import { Button } from "@/components/ui/button"
import { ColorModeButton } from "@/components/ui/color-mode"
import { useMessagesUnreadCount } from "@/hooks/useMessages"
import Logo from "/assets/images/dreamedtech_single.svg"

import UserMenu from "./UserMenu"

function Navbar() {
  const { count: totalUnreadMessages } = useMessagesUnreadCount()

  return (
    <>
      {/* Desktop Navbar */}
      <header className="hidden md:flex sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 w-full items-center justify-between px-6">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="relative">
              <img
                src={Logo}
                alt="DreamEdTech"
                className="h-9 w-9 transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Dream LMS
            </span>
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <NotificationBell />

            <Link to="/messaging">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Messages ${totalUnreadMessages > 0 ? `(${totalUnreadMessages} unread)` : ""}`}
                className="relative h-10 w-10 rounded-full hover:bg-accent/80 active:scale-95 transition-all"
              >
                <Mail className="h-5 w-5" />
                {totalUnreadMessages > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {totalUnreadMessages > 9 ? "9+" : totalUnreadMessages}
                    </span>
                  </span>
                )}
              </Button>
            </Link>

            <ColorModeButton />

            <div className="h-6 w-px bg-border mx-2" />

            <UserMenu />
          </div>
        </div>
      </header>

      {/* Mobile Navbar */}
      <header className="flex md:hidden sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 w-full items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={Logo} alt="DreamEdTech" className="h-8 w-8" />
            <span className="text-lg font-bold">Dream LMS</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <NotificationBell size="sm" />

            <Link to="/messaging">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Messages ${totalUnreadMessages > 0 ? `(${totalUnreadMessages} unread)` : ""}`}
                className="relative h-9 w-9 rounded-full hover:bg-accent/80 active:scale-95 transition-all"
              >
                <Mail className="h-4 w-4" />
                {totalUnreadMessages > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {totalUnreadMessages > 9 ? "9+" : totalUnreadMessages}
                  </span>
                )}
              </Button>
            </Link>

            <ColorModeButton />
            <UserMenu />
          </div>
        </div>
      </header>
    </>
  )
}

export default Navbar
