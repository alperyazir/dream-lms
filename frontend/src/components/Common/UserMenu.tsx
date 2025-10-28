import { Button } from "@/components/ui/button"
import { Link } from "@tanstack/react-router"
import { FaUserAstronaut } from "react-icons/fa"
import { FiLogOut, FiUser } from "react-icons/fi"

import useAuth from "@/hooks/useAuth"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"

const UserMenu = () => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    logout()
  }

  return (
    <>
      {/* Desktop */}
      <div className="flex">
        <MenuRoot>
          <MenuTrigger asChild className="p-2">
            <Button data-testid="user-menu" variant="default" className="max-w-sm truncate">
              <FaUserAstronaut fontSize="18" />
              <span>{user?.full_name || "User"}</span>
            </Button>
          </MenuTrigger>

          <MenuContent>
            <Link to="/settings">
              <MenuItem
                closeOnSelect
                value="user-settings"
                className="gap-2 py-2 cursor-pointer"
              >
                <FiUser fontSize="18px" />
                <div className="flex-1">My Profile</div>
              </MenuItem>
            </Link>

            <MenuItem
              value="logout"
              className="gap-2 py-2 cursor-pointer"
              onClick={handleLogout}
            >
              <FiLogOut />
              Log Out
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      </div>
    </>
  )
}

export default UserMenu
