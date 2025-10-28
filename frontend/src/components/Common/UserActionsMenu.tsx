import { BsThreeDotsVertical } from "react-icons/bs"
import type { UserPublic } from "@/client"
import { IconButton } from "@/components/ui/icon-button"
import DeleteUser from "../Admin/DeleteUser"
import EditUser from "../Admin/EditUser"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface UserActionsMenuProps {
  user: UserPublic
  disabled?: boolean
}

export const UserActionsMenu = ({ user, disabled }: UserActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton
          variant="ghost"
          aria-label="User actions menu"
          disabled={disabled}
        >
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditUser user={user} />
        <DeleteUser id={user.id} />
      </MenuContent>
    </MenuRoot>
  )
}
