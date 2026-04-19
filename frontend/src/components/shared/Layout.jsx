import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  LayoutDashboard, List, Shield, BarChart2,
  MessageSquare, User, LogOut, Zap, Moon, Sun, Monitor,
  Menu, X,
} from 'lucide-react'

const workerNav = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/shifts',     icon: List,            label: 'My Shifts'  },
  { to: '/grievances', icon: MessageSquare,   label: 'Community'  },
  { to: '/profile',    icon: User,            label: 'Profile'    },
]
const verifierNav = [
  { to: '/verify',     icon: Shield,        label: 'Verify Earnings' },
  { to: '/grievances', icon: MessageSquare, label: 'Community'       },
  { to: '/profile',    icon: User,          label: 'Profile'         },
]
const advocateNav = [
  { to: '/advocate',   icon: BarChart2,     label: 'Analytics'       },
  { to: '/verify',     icon: Shield,        label: 'Verify Earnings' },
  { to: '/grievances', icon: MessageSquare, label: 'Community'       },
  { to: '/profile',    icon: User,          label: 'Profile'         },
]
const roleNav = { worker: workerNav, verifier: verifierNav, advocate: advocateNav }
const roleBadge    = { worker: 'badge-green', verifier: 'badge-blue', advocate: 'badge-violet' }
const avatarColors = {
  worker:   'bg-emerald-500/15 text-emerald-400',
  verifier: 'bg-blue-500/15 text-blue-400',
  advocate: 'bg-violet-500/15 text-violet-400',
}
const THEMES = [
  { key: 'dark',   Icon: Moon,    tip: 'Dark'   },
  { key: 'light',  Icon: Sun,     tip: 'Light'  },
  { key: 'system', Icon: Monitor, tip: 'System' },
]

function SidebarContent({ onNavClick }) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate  = useNavigate()
  const location  = useLocation()
  const nav       = roleNav[user?.role] || workerNav
  const initials  = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <Zap size={15} className="text-white" fill="currentColor" />
          </div>
          <span className="font-display font-bold text-base" style={{ color: 'var(--ink)' }}>FairGig</span>
          <div className="pulse-dot ml-auto" />
        </div>
      </div>

      {/* User card */}
      <div className="mx-3 my-3 rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColors[user?.role] || avatarColors.worker}`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{user?.full_name || 'User'}</p>
            <span className={`badge ${roleBadge[user?.role]}`}>{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-1 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to
          return (
            <NavLink key={to} to={to} onClick={onNavClick}
              className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} className="flex-shrink-0" />
              <span>{label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom: theme + logout */}
      <div className="px-2.5 pb-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1 mb-3 px-1">
          <span className="section-label flex-1">Theme</span>
          <div className="flex items-center gap-1">
            {THEMES.map(({ key, Icon, tip }) => (
              <button key={key} onClick={() => setTheme(key)} aria-label={tip}
                className={`theme-btn tooltip`} data-tip={tip}
                style={theme === key ? { background: 'var(--bg-elevated)', color: 'var(--ink)', borderColor: 'rgba(34,197,94,0.35)' } : {}}>
                <Icon size={13} />
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/login') }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ color: 'var(--ink-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-muted)' }}>
          <LogOut size={15} /><span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Desktop sidebar ───────────────────────── */}
      <aside className="hidden md:flex flex-col w-[220px] flex-shrink-0"
        style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-[240px] flex flex-col slide-right"
            style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
            <div className="flex items-center justify-end px-4 pt-4">
              <button onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg" style={{ color: 'var(--ink-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <SidebarContent onNavClick={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ink-muted)' }}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Zap size={12} className="text-white" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>FairGig</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}