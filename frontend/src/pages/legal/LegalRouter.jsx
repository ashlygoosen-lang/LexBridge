import { Navigate, useParams } from 'react-router-dom'
import Terms from './Terms'
import Refunds from './Refunds'
import Privacy from './Privacy'
import { CompanyInfo, Cookies, Disclaimer, Paia, Practitioners } from './OtherPolicies'

const PAGES = {
  terms: Terms,
  refunds: Refunds,
  privacy: Privacy,
  cookies: Cookies,
  practitioners: Practitioners,
  paia: Paia,
  disclaimer: Disclaimer,
  company: CompanyInfo,
}

export default function LegalRouter() {
  const { page } = useParams()
  const Page = PAGES[page]
  if (!Page) return <Navigate replace to="/legal/terms" />
  return <Page />
}
