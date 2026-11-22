import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { homeFor } from './lib/format'
import { Loading } from './components/ui'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Directory, { LawyerProfilePage } from './pages/Directory'
import { ClientDashboard, MatterPage, MattersList, WorkspaceIndex } from './pages/client/ClientPages'
import { Checkout, Payments, Workspace } from './pages/client/Workspace'
import { LawyerFeed, LawyerOffers, LawyerProfileEdit } from './pages/lawyer/LawyerPages'
import { CaseTracker, PoliceReport, StationDirectory } from './pages/police/PolicePages'
import { Account, Help, Legal, NotFound } from './pages/Misc'

const CourtDirectory = lazy(() => import('./pages/Reference').then((m) => ({ default: m.CourtDirectory })))
const MagistrateDirectory = lazy(() => import('./pages/Reference').then((m) => ({ default: m.MagistrateDirectory })))
const Rules = lazy(() => import('./pages/Reference').then((m) => ({ default: m.Rules })))
const Admin = lazy(() => import('./pages/admin/Admin'))
const JusticeDashboard = lazy(() => import('./pages/justice/JusticeDashboard'))

function Guard({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user === undefined) return <Loading />
  if (!user) return <Navigate replace to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} />
  if (roles && !roles.includes(user.role)) return <Navigate replace to={homeFor(user)} />
  return children
}

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return null
}

function LoginRoute() {
  const { user } = useAuth()
  const location = useLocation()
  if (user === undefined) return <Loading />
  const next = new URLSearchParams(location.search).get('next')
  if (user) return <Navigate replace to={next && next.startsWith('/') && !next.startsWith('//') ? next : homeFor(user)} />
  return <Auth />
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/lawyers" element={<Directory />} />
        <Route path="/lawyers/:id" element={<LawyerProfilePage />} />
        <Route path="/courts" element={<CourtDirectory />} />
        <Route path="/magistrates" element={<MagistrateDirectory />} />
        <Route path="/fees" element={<Rules />} />
        <Route path="/police-stations" element={<StationDirectory />} />
        <Route path="/police-report" element={<PoliceReport />} />
        <Route path="/police-report/:id" element={<CaseTracker />} />
        <Route path="/help" element={<Help />} />
        <Route path="/legal/:page" element={<Legal />} />

        <Route path="/client" element={<Guard roles={['client']}><ClientDashboard /></Guard>} />
        <Route path="/matters" element={<Guard roles={['client', 'lawyer']}><MattersList /></Guard>} />
        <Route path="/matters/:id" element={<Guard roles={['client', 'lawyer', 'admin']}><MatterPage /></Guard>} />
        <Route path="/matters/:id/workspace" element={<Guard roles={['client', 'lawyer', 'admin']}><Workspace /></Guard>} />
        <Route path="/matters/:id/checkout" element={<Guard roles={['client']}><Checkout /></Guard>} />
        <Route path="/workspace" element={<Guard roles={['client', 'lawyer']}><WorkspaceIndex /></Guard>} />
        <Route path="/payments" element={<Guard roles={['client', 'lawyer']}><Payments /></Guard>} />
        <Route path="/account" element={<Guard><Account /></Guard>} />

        <Route path="/lawyer" element={<Guard roles={['lawyer']}><LawyerFeed /></Guard>} />
        <Route path="/lawyer/offers" element={<Guard roles={['lawyer']}><LawyerOffers /></Guard>} />
        <Route path="/lawyer/profile" element={<Guard roles={['lawyer']}><LawyerProfileEdit /></Guard>} />

        <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
        <Route path="/dashboard" element={<Guard><JusticeDashboard /></Guard>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  )
}
