import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Icon, Logo } from './Icon'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { ago, initials, ROLE_LABEL } from '../lib/format'

const NAV = {
  client: [
    ['Overview', '/client'],
    ['My matters', '/matters'],
    ['Case workspace', '/workspace'],
    ['Payments & mandate', '/payments'],
    ['Find a lawyer', '/lawyers'],
    ['Police reports', '/police-report'],
    ['Fees & court rules', '/fees'],
    ['Court directory', '/courts'],
    ['Magistrate finder', '/magistrates'],
  ],
  lawyer: [
    ['Matter feed', '/lawyer'],
    ['My offers', '/lawyer/offers'],
    ['Active matters', '/matters'],
    ['Earnings & payouts', '/payments'],
    ['Practice profile', '/lawyer/profile'],
    ['Justice cases', '/dashboard'],
    ['Fee schedule', '/fees'],
    ['Court directory', '/courts'],
    ['Magistrate finder', '/magistrates'],
  ],
  admin: [
    ['Overview', '/admin'],
    ['Verification queue', '/admin?tab=verification'],
    ['Post moderation', '/admin?tab=moderation'],
    ['Payments & disputes', '/admin?tab=payments'],
    ['Users & roles', '/admin?tab=users'],
    ['Justice cases', '/admin?tab=cases'],
    ['Identity reviews', '/admin?tab=identity'],
    ['Police stations', '/admin?tab=stations'],
    ['Rules content', '/fees'],
  ],
}

function NotificationsButton() {
  const { user, refresh } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const navigate = useNavigate()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    api.get('/auth/notifications').then((r) => r.ok && setItems(r.notifications))
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const openItem = async (n) => {
    await api.post('/auth/notifications/read', { ids: [n.id] })
    refresh()
    setOpen(false)
    if (n.link) navigate(n.link)
  }
  const markAll = async () => {
    await api.post('/auth/notifications/read')
    setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })))
    refresh()
  }

  return (
    <div ref={ref} className="relative">
      <button className="notification-btn" aria-label="Notifications" onClick={() => setOpen(!open)}>
        {user?.unreadNotifications > 0 && <span />}
        <Icon name="bell" size={19} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[340px] rounded-xl border border-[#d8ddd9] bg-white p-2 shadow-[0_15px_45px_rgba(10,30,40,.15)]">
          <div className="flex items-center justify-between px-2 py-2">
            <b className="text-xs text-[#0b2635]">Notifications</b>
            <button onClick={markAll} className="text-[14px] font-bold text-[#1f6e6a]">
              Mark all read
            </button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-xs text-[#65767b]">You’re all caught up.</p>}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`block w-full rounded-lg px-3 py-3 text-left hover:bg-[#f1f3f0] ${n.readAt ? '' : 'bg-[#fff8ea]'}`}
              >
                <b className="block text-[14px] text-[#0b2635]">{n.title}</b>
                <span className="mt-1 block text-[14px] leading-4 text-[#52646a]">{n.message}</span>
                <small className="mt-1 block text-[14px] text-[#8a979b]">{ago(n.createdAt)}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AppHeader() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const signOut = async () => {
    await logout()
    navigate('/')
  }
  return (
    <header className="product-header">
      <div className="product-logo">
        <Logo />
      </div>
      <form
        className="product-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (!q.trim()) return
          navigate(user?.role === 'lawyer' ? `/lawyer?q=${encodeURIComponent(q)}` : `/lawyers?q=${encodeURIComponent(q)}`)
        }}
      >
        <Icon name="search" size={18} />
        <input
          aria-label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={user?.role === 'lawyer' ? 'Search matter summaries' : 'Search lawyers by name or practice area'}
        />
      </form>
      <div className="product-actions">
        <NotificationsButton />
        <button className="account-menu" onClick={() => setOpen(!open)}>
          <span className="avatar-initials">{initials(user?.name)}</span>
          <span>
            <b>{user?.name}</b>
            <small>{ROLE_LABEL[user?.role]}</small>
          </span>
          <Icon name="chevron" size={15} />
        </button>
      </div>
      {open && (
        <div className="account-popover" onMouseLeave={() => setOpen(false)}>
          <button onClick={() => navigate('/account')}>Profile & settings</button>
          <button onClick={() => navigate('/account#privacy')}>Privacy centre</button>
          {user?.role === 'lawyer' && <button onClick={() => navigate('/lawyer/profile')}>Practice profile</button>}
          <button onClick={signOut}>Sign out</button>
        </div>
      )}
    </header>
  )
}

function SideNav() {
  const { user } = useAuth()
  const role = user?.role === 'lawyer' ? 'lawyer' : user?.role === 'admin' ? 'admin' : 'client'
  const links = NAV[role]
  const here = typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''
  return (
    <aside className="side-nav">
      <div className="side-role">
        <span>{role === 'lawyer' ? 'LAWYER PORTAL' : role === 'admin' ? 'PLATFORM ADMIN' : 'CLIENT PORTAL'}</span>
        <b>{role === 'lawyer' ? 'Practice workspace' : role === 'admin' ? 'Operations centre' : 'My legal matters'}</b>
      </div>
      <nav>
        {links.map(([label, to], i) => (
          <NavLink
            key={label}
            to={to}
            end
            className={({ isActive }) => {
              const active = to.includes('?') ? here === to : isActive && !(to === '/admin' && here.includes('?tab='))
              return `side-link ${active ? 'active' : ''}`
            }}
          >
            <span>{String(i + 1).padStart(2, '0')}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="side-help">
        <Icon name="shield" size={20} />
        <b>Need help?</b>
        <p>Our support team is available weekdays, 08:00–17:00.</p>
        <Link to="/help">Visit help centre</Link>
      </div>
    </aside>
  )
}

export function PortalLayout({ children }) {
  return (
    <div className="product-app">
      <AppHeader />
      <div className="product-frame">
        <SideNav />
        <main className="product-main">{children}</main>
      </div>
    </div>
  )
}
