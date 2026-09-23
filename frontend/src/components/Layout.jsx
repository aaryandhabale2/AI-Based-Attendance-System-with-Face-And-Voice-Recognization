// src/components/Layout.jsx — App shell: sidebar + topbar + main content
import { useState } from 'react'
import TopBar from './TopBar'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <TopBar onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
