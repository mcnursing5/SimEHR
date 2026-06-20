'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight, Bell, ShieldCheck } from 'lucide-react'

export default function AppShell({ profile, children }: { profile: any; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const role = profile?.role

  const navItems: Record<string, any[]> = {
    admin: [
      { label: 'Dashboard', href: '/dashboard' },
      { section: 'System' },
      { label: 'Users', href: '/admin/users' },
      { label: 'Academic Years', href: '/admin/years' },
      { label: 'Course Catalog', href: '/admin/catalog' },
      { label: 'Faculty Assignments', href: '/admin/faculty' },
      { section: 'Content' },
      { label: 'All Courses', href: '/admin/courses' },
      { label: 'Sim Repository', href: '/admin/repository' },
      { section: 'Account' },
      { label: 'Settings', href: '/admin/settings' },
    ],
    sim_coordinator: [
      { label: 'Dashboard', href: '/dashboard' },
      { section: 'Management' },
      { label: 'Course Catalog', href: '/admin/catalog' },
      { label: 'Faculty Assignments', href: '/admin/faculty' },
      { label: 'All Courses', href: '/admin/courses' },
      { section: 'Simulations' },
      { label: 'Sim Repository', href: '/admin/repository' },
      { label: 'Create Scenario', href: '/faculty/scenarios/new' },
      { section: 'Review' },
      { label: 'All Student Charts', href: '/sim-coordinator/review' },
    ],
    faculty: [
      { label: 'Dashboard', href: '/dashboard' },
      { section: 'Teaching' },
      { label: 'My Courses', href: '/faculty/courses' },
      { label: 'My Students', href: '/faculty/students' },
      { section: 'Simulations' },
      { label: 'Sim Repository', href: '/faculty/repository' },
      { label: 'Create Scenario', href: '/faculty/scenarios/new' },
      { section: 'Review' },
      { label: 'Student Charts', href: '/faculty/review' },
    ],
    student: [
      { label: 'Dashboard', href: '/dashboard' },
      { section: 'My Simulations' },
      { label: 'Active Sims', href: '/student/simulations' },
      { label: 'My Courses', href: '/student/courses' },
      { section: 'Account' },
      { label: 'My Profile', href: '/student/profile' },
    ],
  }

  const items = navItems[role] ?? []

  const roleConfig: Record<string, { label: string; badge: string }> = {
    admin: { label: 'Administrator', badge: 'badge-purple' },
    sim_coordinator: { label: 'Sim Coordinator', badge: 'badge-blue' },
    faculty: { label: 'Faculty', badge: 'badge-green' },
    student: { label: 'Student', badge: 'badge-blue' },
  }

  const rc = roleConfig[role] ?? roleConfig.student

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/auth/login')
  }

  // UUID pattern for breadcrumb replacement
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar */}
      <aside
        className={cn(
          'sidebar transition-all duration-200 flex-shrink-0 overflow-y-auto flex flex-col',
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
          <img src="/logo.png" alt="Streakk" className="h-6 w-auto flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-white font-bold text-sm leading-none">EHR</div>
            <div className="text-slate-400 text-xs mt-0.5">Nursing Simulation</div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">
              {profile?.first_name} {profile?.last_name}
            </div>
            <div className="text-slate-400 text-xs mt-0.5">{rc.label}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="py-2 flex-1">
          {items.map((item: any, i: number) => {
            if (item.section) {
              return (
                <div key={i} className="sidebar-section mt-2">
                  {item.section}
                </div>
              )
            }

            const hasQuery = item.href.includes('?')
            const basePath = item.href.split('?')
            const isActive = hasQuery
              ? false // query-string nav items (e.g. "New Course") are action shortcuts, never highlighted
              : pathname === item.href || (basePath !== '/dashboard' && pathname.startsWith(basePath))

            return (
              <Link key={i} href={item.href} className={cn('sidebar-item', isActive && 'active')}>
                <span className="truncate">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="sidebar-item w-full rounded-md hover:bg-red-900/50 text-red-400 hover:text-red-300">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700 p-1 rounded">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Breadcrumb — replace UUIDs with friendly labels */}
          <div className="text-sm text-gray-500 hidden sm:flex items-center gap-1">
            {pathname
              .split('/')
              .filter(Boolean)
              .map((seg, i, arr) => {
                const prev = arr[i - 1] ?? ''
                const label = uuidRe.test(seg)
                  ? prev === 'chart'
                    ? 'Simulation Chart'
                    : prev === 'courses'
                    ? 'Course Detail'
                    : prev === 'review'
                    ? 'Chart Review'
                    : prev === 'scenarios'
                    ? 'Scenario'
                    : 'Detail'
                  : seg.replace(/-/g, ' ')

                return (
                  <span key={i} className="flex items-center gap-1">
                    <span className="capitalize">{label}</span>
                    {i < arr.length - 1 && <span className="text-gray-300">/</span>}
                  </span>
                )
              })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className={cn('badge text-xs flex items-center gap-1', rc.badge)}>
              {role === 'admin' && <ShieldCheck className="w-3 h-3" />}
              {rc.label}
            </span>
            <button className="relative text-gray-500 hover:text-gray-700 p-1 rounded">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
