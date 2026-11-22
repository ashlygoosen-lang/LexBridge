import { NavLink, useNavigate } from 'react-router-dom'
import { Logo } from './Icon'
import { useAuth } from '../lib/auth'
import { homeFor } from '../lib/format'

export function PublicHeader({ court = false, magistrate = false }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const link = ({ isActive }) => (isActive ? 'active' : '')
  return (
    <header className={`directory-header ${court ? 'court-header' : ''}`}>
      <button onClick={() => navigate('/')} aria-label="LexBridge home">
        <Logo as="span" />
      </button>
      <nav>
        <NavLink to="/#process" className="">
          How it works
        </NavLink>
        <NavLink to="/lawyers" className={link}>
          Find a lawyer
        </NavLink>
        <NavLink to="/fees" className={link}>
          Fees & court rules
        </NavLink>
        <NavLink to="/courts" className={link}>
          {magistrate || court ? 'Superior courts' : 'Court directory'}
        </NavLink>
        <NavLink to="/magistrates" className={link}>
          Magistrate courts
        </NavLink>
        <NavLink to="/police-stations" className={link}>
          Police stations
        </NavLink>
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
      </div>
    </header>
  )
}
