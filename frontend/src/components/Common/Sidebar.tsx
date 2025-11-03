import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  return (
    <div className="hidden md:flex flex-col sticky top-0 bg-subtle min-w-xs h-screen shadow-neuro">
      <div className="flex flex-col flex-1 py-4 overflow-y-auto">
        <SidebarItems />
      </div>
    </div>
  )
}

export default Sidebar
