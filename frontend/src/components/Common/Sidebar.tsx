import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  return (
    <div className="flex sticky top-0 bg-subtle min-w-xs h-screen p-4">
      <div className="w-full">
        <SidebarItems />
      </div>
    </div>
  )
}

export default Sidebar
