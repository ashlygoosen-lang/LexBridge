import { Link } from 'react-router-dom'
import { Callout, LegalDoc, Table } from './LegalDoc'
import { company, onRequest } from '../../data/company'

export function Cookies() {
  const sections = [
    {
      id: 'what',
      title: 'What cookies and similar technologies are',
      body: (
        <p>
          Cookies are small text files a website stores in your browser. “Local storage” and “session storage” are similar browser features. They let a website
          remember things such as whether you are signed in.
        </p>
      ),
    },
    {
      id: 'ours',
      title: 'What LexBridge uses',
      body: (
        <>
          <Table
            head={['Name', 'Type', 'Purpose', 'How long']}
            rows={[
              ['lexbridge_session', 'Essential cookie (HTTP-only, secure)', 'Keeps you signed in and protects your account', '7 days, or until you sign out'],
              ['lexbridge_matter_draft', 'Session storage', 'Saves a matter you started writing so that you do not lose it while you sign up', 'Until you close the browser tab or post the matter'],
            ]}
          />
          <p>
            Essential technologies do not need your consent because the platform cannot work without them. <b>We do not use advertising, analytics or
            cross-site tracking cookies.</b> If we ever want to add them, we will ask for your consent first and update this notice.
          </p>
        </>
      ),
    },
    {
      id: 'third',
      title: 'Third-party content',
      body: (
        <ul>
          <li>
            <b>Fonts and images</b> are loaded from third-party content networks (such as Google Fonts and image hosts). Your browser connects to them, which
            shares your IP address and browser type with that provider. They do not receive your LexBridge account information.
          </li>
          <li>
            <b>Payment pages</b> are run by our payment provider, {company.paymentProvider}, which may set its own cookies to process your payment securely. Its
            own privacy and cookie notices apply on those pages.
          </li>
          <li>
            <b>Map links</b> open Google Maps in a new tab when you choose “Directions”. Google’s terms and privacy policy apply there.
          </li>
        </ul>
      ),
    },
    {
      id: 'control',
      title: 'Managing cookies',
      body: (
        <p>
          You can delete or block cookies in your browser settings. If you block the session cookie, you will not be able to sign in. Clearing your browser
          storage removes any unsaved matter draft.
        </p>
      ),
    },
  ]
  return (
    <LegalDoc
      slug="cookies"
      title="Cookie Notice"
      intro="LexBridge uses one essential cookie to keep you signed in — and no advertising or tracking cookies."
      sections={sections}
    />
  )
}

export function Practitioners() {
  const sections = [
    {
      id: 'scope',
      title: 'Scope',
      body: (
        <p>
          These Practitioner Terms apply, in addition to the <Link to="/legal/terms">Terms of Use</Link>, to attorneys and advocates who list on LexBridge. If
          they conflict, these Practitioner Terms apply to your use as a practitioner. Nothing in them requires you to act contrary to the Legal Practice Act 28 of
          2014 (“LPA”), the Legal Practice Council (“LPC”) rules or the LPC Code of Conduct, which always take precedence.
        </p>
      ),
    },
    {
      id: 'eligibility',
      title: 'Who may list',
      body: (
        <ul>
          <li>You must be admitted and enrolled as a legal practitioner with the LPC and entitled to practise.</li>
          <li>Attorneys practising for their own account, or as part of a firm, must hold a valid Fidelity Fund certificate.</li>
          <li>
            Advocates must state whether they practise as a referral advocate or as an advocate with a trust account. Referral advocates may accept instructions
            only on a brief from an attorney, as the LPC rules require, and must not accept fees directly from a client unless the rules allow it.
          </li>
          <li>You must give us accurate credentials and keep them up to date. Changing your credentials sends your profile back for review.</li>
        </ul>
      ),
    },
    {
      id: 'verification',
      title: 'Verification and ongoing checks',
      body: (
        <p>
          Before you can respond to matters, we check your identity, LPC enrolment, practising status, Fidelity Fund certificate (where required) and firm
          details. You authorise us to confirm these with the LPC and the Legal Practitioners’ Fidelity Fund. You must tell us within 5 business days if you are
          suspended, struck off, lose your Fidelity Fund certificate or become the subject of disciplinary findings. We may suspend your profile until your
          credentials are confirmed again.
        </p>
      ),
    },
    {
      id: 'fees',
      title: 'Fees, referrals and money received',
      body: (
        <>
          <Callout>
            <p>
              <b>No referral fees.</b> LexBridge does not charge you for client referrals and does not share in your fees. You must not pay or reward any person for
              introducing clients to you through LexBridge.
            </p>
          </Callout>
          <ul>
            <li>Your offers must be honest, clear and complete. Show amounts in rand including VAT, and break down the stages a client can expect.</li>
            <li>Tell the client in writing before your fees will exceed the estimate in your offer, and do not charge fees that are excessive.</li>
            <li>Contingency fee arrangements must comply with the Contingency Fees Act 66 of 1997.</li>
            <li>
              Consultation fees and invoices paid through LexBridge are collected by our payment provider on your behalf and paid over to you. You are responsible
              for treating money received in line with the LPA and LPC rules, including trust-account rules where they apply, and for your own tax and VAT.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'conduct',
      title: 'Professional conduct on the platform',
      body: (
        <ul>
          <li>Run a conflict check before accepting a matter, and tell the client at once if you cannot act.</li>
          <li>Respect anonymity: do not try to identify or contact a client before they accept your offer.</li>
          <li>Attend consultations on time. If you must cancel, the client receives a full refund of the consultation fee.</li>
          <li>Use the mandate to confirm scope and fees, and keep the client informed through the workspace.</li>
          <li>Keep client information confidential and protect it under POPIA. Once appointed, you are a responsible party for that information.</li>
          <li>Do not post misleading content, testimonials you cannot substantiate, or claims of specialisation you are not entitled to make.</li>
        </ul>
      ),
    },
    {
      id: 'reviews',
      title: 'Ratings and complaints',
      body: (
        <p>
          Ratings reflect clients’ experiences. We may remove reviews that are abusive or fraudulent but not because they are negative. If a client complains to
          us about your conduct, we will tell you and give you a chance to respond. We may suspend your profile while we review a serious complaint, and we may
          refer matters to the LPC where the law or the public interest requires.
        </p>
      ),
    },
    {
      id: 'ending',
      title: 'Ending your listing',
      body: (
        <p>
          You may close your profile at any time. Closing it does not end mandates you have accepted — you must complete or properly terminate them under the
          LPA and LPC rules, and refund any consultation fee for a consultation that has not taken place.
        </p>
      ),
    },
  ]
  return (
    <LegalDoc
      slug="practitioners"
      title="Practitioner Terms"
      intro="The rules for attorneys and advocates who list on LexBridge, aligned with the Legal Practice Act and the Legal Practice Council Code of Conduct."
      summary={[
        'You must be enrolled with the Legal Practice Council and, where required, hold a Fidelity Fund certificate.',
        'LexBridge charges no referral fees and takes no share of your fees.',
        'Offers must be honest, in rand including VAT, and you must give notice before exceeding them.',
        'Respect client anonymity until they appoint you, and run conflict checks.',
        'If you cancel a consultation, the client gets a full refund.',
      ]}
      sections={sections}
    />
  )
}

export function Paia() {
  const sections = [
    {
      id: 'about',
      title: 'About this page',
      body: (
        <p>
          The Promotion of Access to Information Act 2 of 2000 (“PAIA”) gives you the right to request access to records held by private bodies when you need
          them to exercise or protect a right. This page explains how to request records from {company.legalName}, trading as LexBridge. If you only want a copy
          of your own personal information, you can usually just email us — see our <Link to="/legal/privacy">Privacy Policy</Link>.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact details',
      body: (
        <Table
          head={['', '']}
          rows={[
            ['Private body', `${company.legalName} (${company.registrationNumber}), trading as ${company.brand}`],
            ['Information Officer', 'The head of the private body'],
            ['Email for requests', company.privacyEmail],
            ['Physical address', onRequest('physicalAddress')],
            ['Telephone', onRequest('phone')],
          ]}
        />
      ),
    },
    {
      id: 'records',
      title: 'Categories of records we hold',
      body: (
        <ul>
          <li>Company records: incorporation documents, statutory registers and board records.</li>
          <li>Financial and tax records: accounting records, payment records and VAT records.</li>
          <li>Platform records: user accounts, practitioner verification records, matters, offers, mandates, messages, payments and audit logs.</li>
          <li>Police report and justice case records created by users, which are subject to strict access restrictions.</li>
          <li>Policies, contracts with service providers and security records.</li>
        </ul>
      ),
    },
    {
      id: 'request',
      title: 'How to make a request',
      body: (
        <ol>
          <li>
            Complete the prescribed request form (Form 2) available from the{' '}
            <a href="https://inforegulator.org.za" target="_blank" rel="noreferrer">
              Information Regulator’s website
            </a>
            .
          </li>
          <li>Describe the records you want precisely enough for us to find them, and say which right you are trying to exercise or protect.</li>
          <li>Email the form and a copy of your ID to {company.privacyEmail}. If you are acting for someone else, include proof of your authority.</li>
          <li>
            We will let you know if a request fee or access fee applies, as prescribed under PAIA. No fee applies to a request for your own personal information.
          </li>
        </ol>
      ),
    },
    {
      id: 'outcome',
      title: 'Our decision',
      body: (
        <>
          <p>
            We will decide on your request within 30 days, or tell you if we need to extend that period as PAIA allows. We may refuse access only on the grounds
            PAIA sets out — for example, to protect another person’s privacy, confidential or privileged information, or the safety of individuals. Records in
            police reports and justice cases often contain other people’s personal information and may be released only in part.
          </p>
          <p>
            If you disagree with our decision, you may complain to the Information Regulator (PAIAComplaints@inforegulator.org.za) or apply to court.
          </p>
        </>
      ),
    },
  ]
  return (
    <LegalDoc
      slug="paia"
      title="Access to Information (PAIA)"
      intro="How to request records from LexBridge under the Promotion of Access to Information Act."
      sections={sections}
    />
  )
}

export function Disclaimer() {
  const sections = [
    {
      id: 'not-advice',
      title: 'Not legal advice',
      body: (
        <p>
          LexBridge is an independent legal marketplace, not a law firm. Court guides, fee guidance, process maps and FAQs on this website are general information
          to help you understand the system. They are not legal advice and may not apply to your situation. For advice, consult a legal practitioner.
        </p>
      ),
    },
    {
      id: 'not-saps',
      title: 'Not SAPS or a court',
      body: (
        <p>
          A police report prepared on LexBridge, and any LexBridge platform reference, is not an official SAPS case, CAS number, court record or court order. Only
          SAPS can open a criminal case and only a court can issue orders. In an emergency call 10111 (or 112 from a cell phone).
        </p>
      ),
    },
    {
      id: 'directories',
      title: 'Directories and third-party information',
      body: (
        <p>
          Court, magistrate and police station details come from official public sources and are shown with their source and date. Names, telephone numbers and
          addresses change, so please confirm them before travelling or filing. Links to other websites are for convenience; we are not responsible for their
          content.
        </p>
      ),
    },
    {
      id: 'practitioners',
      title: 'Practitioners',
      body: (
        <p>
          We verify practitioners’ credentials, but practitioners are independent and responsible for their own advice and services. Ratings reflect other
          clients’ experiences and are not a guarantee.
        </p>
      ),
    },
  ]
  return <LegalDoc slug="disclaimer" title="Disclaimer" intro="What LexBridge is — and what it is not." sections={sections} />
}

export function CompanyInfo() {
  const sections = [
    {
      id: 'details',
      title: 'Supplier information',
      body: (
        <>
          <p>
            Section 43 of the Electronic Communications and Transactions Act requires suppliers who sell services online to publish the following information.
          </p>
          <Table
            head={['', '']}
            rows={[
              ['Brand', `${company.brand} — a division of ${company.legalName}`],
              ['Full legal name and status', `${company.legalName}, ${company.legalStatus.toLowerCase()}`],
              ['Registration number', company.registrationNumber],
              ['Place of registration', company.placeOfRegistration],
              ['Head office', company.headOffice],
              ['Physical address', onRequest('physicalAddress')],
              ['Address for service of legal documents', onRequest('serviceAddress')],
              ['Telephone', onRequest('phone')],
              ['Directors / office bearers', onRequest('officeBearers')],
              ['VAT number', company.vatNumber || 'Not applicable / available on request'],
              ['General email', company.email],
              ['Privacy and Information Officer', company.privacyEmail],
              ['Legal notices', company.legalEmail],
              ['Payment disputes', company.disputesEmail],
              ['Support hours', company.supportHours],
            ]}
          />
        </>
      ),
    },
    {
      id: 'services',
      title: 'Our services and prices',
      body: (
        <p>
          LexBridge provides an online marketplace connecting clients with verified South African legal practitioners, a police report preparation and case
          tracking tool, and a digital justice workspace. Using the marketplace, posting matters and the police report tool are free. Consultation fees and legal
          fees are set by each practitioner and shown in rand, including VAT where applicable, before you pay. See the{' '}
          <Link to="/legal/terms">Terms of Use</Link> and <Link to="/legal/refunds">Refund &amp; Cancellation Policy</Link>.
        </p>
      ),
    },
    {
      id: 'payment',
      title: 'Payment and security',
      body: (
        <p>
          Payments are processed by {company.paymentProvider} on a secure page. LexBridge does not see or store card or bank account details. Our security and
          privacy practices are described in our <Link to="/legal/privacy">Privacy Policy</Link>.
        </p>
      ),
    },
  ]
  return (
    <LegalDoc
      slug="company"
      title="Company Information"
      intro={`${company.brand} is a division of ${company.legalName}, registration number ${company.registrationNumber}.`}
      sections={sections}
    />
  )
}
