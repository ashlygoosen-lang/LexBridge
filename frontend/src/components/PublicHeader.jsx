import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from './Icon'
import { useAuth } from '../lib/auth'
import { homeFor } from '../lib/format'

const LINKS = [
  ['/lawyers', 'Find a lawyer'],
  ['/fees', 'Fees & court rules'],
  ['/courts', 'Court directory'],
  ['/magistrates', 'Magistrate courts'],
  ['/police-stations', 'Police stations'],
  ['/help', 'Help'],
]

export function PublicHeader({ court = false, magistrate = false }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const link = ({ isActive }) => (isActive ? 'active' : '')
  useEffect(() => setOpen(false), [pathname])
  const label = (to, text) => (to === '/courts' && (magistrate || court) ? 'Superior courts' : text)
  return (
    <header className={`directory-header ${court ? 'court-header' : ''} ${open ? 'is-open' : ''}`}>
      <button onClick={() => navigate('/')} aria-label="LexBridge home">
        <Logo as="span" />
      </button>
      <nav aria-label="Main">
        {LINKS.map(([to, text]) => (
          <NavLink key={to} to={to} className={link}>
            {label(to, text)}
          </NavLink>
        ))}
      </nav>
      <div>
        {user ? (
          <button className="btn btn-primary" onClick={() => navigate(homeFor(user))}>
            My dashboard
          </button>
        ) : (
          <>
            <button onClick={() => navigate('/login')}>Log in</button>
            <button className="btn btn-primary" onClick={() => navigate('/login?mode=signup')}>
              Get started
            </button>
          </>
        )}
        <button
          type="button"
          className="public-menu-btn"
          aria-expanded={open}
          aria-controls="public-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {open && (
        <nav id="public-menu" className="public-menu" aria-label="Main (mobile)">
          {LINKS.map(([to, text]) => (
            <NavLink key={to} to={to} className={link}>
              {label(to, text)}
            </NavLink>
          ))}
          <NavLink to="/police-report" className={link}>
            Create a police report
          </NavLink>
          {!user && (
            <NavLink to="/login" className={link}>
              Log in
            </NavLink>
          )}
        </nav>
      )}
    </header>
  )
}
