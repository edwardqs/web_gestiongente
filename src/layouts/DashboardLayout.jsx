import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out w-full">
        <Navbar 
          setSidebarOpen={setSidebarOpen} 
          isCollapsed={isCollapsed}
        />

        <main className={`flex-1 p-4 md:p-8 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'} transition-all duration-300`}>
          {children}
        </main>
      </div>
    </div>
  )
}
