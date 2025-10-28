import { Link } from "@tanstack/react-router"
import { FaUserAstronaut } from "react-icons/fa"
import { FiLogOut, FiUser } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import useAuth from "@/hooks/useAuth"

const UserMenu = () => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    logout()
  }

  return (
    <>
      {/* Desktop */}
      <div className="flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="p-2">
            <Button
              data-testid="user-menu"
              variant="default"
              className="max-w-sm truncate"
            >
              <FaUserAstronaut fontSize="18" />
              <span>{user?.full_name || "User"}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <Link to="/settings">
              <DropdownMenuItem className="gap-2 py-2 cursor-pointer">
                <FiUser fontSize="18px" />
                <div className="flex-1">My Profile</div>
              </DropdownMenuItem>
            </Link>

            <DropdownMenuItem
              className="gap-2 py-2 cursor-pointer"
              onClick={handleLogout}
            >
              <FiLogOut />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

export default UserMenu
