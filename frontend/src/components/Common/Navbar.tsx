import { Link } from "@tanstack/react-router"

import Logo from "/assets/images/fastapi-logo.svg"
import UserMenu from "./UserMenu"

function Navbar() {
  return (
    <div className="hidden md:flex justify-between sticky top-0 items-center bg-muted w-full p-4">
      <Link to="/">
        <img src={Logo} alt="Logo" className="max-w-xs p-2" />
      </Link>
      <div className="flex gap-2 items-center">
        <UserMenu />
      </div>
    </div>
  )
}

export default Navbar
