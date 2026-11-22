import { Link } from 'react-router-dom'
import { Callout, LegalDoc, Table } from './LegalDoc'
import { company } from '../../data/company'

const REGULATOR = {
  address: 'Woodmead North Office Park, 54 Maxwell Drive, Woodmead, Johannesburg, 2191',
  postal: 'P.O. Box 31533, Braamfontein, Johannesburg, 2017',
  phone: '010 023 5200 · toll-free 0800 017 160',
  enquiries: 'enquiries@inforegulator.org.za',
  complaints: 'POPIAComplaints@inforegulator.org.za',
  web: 'https://inforegulator.org.za',
}

export default function Privacy() {
  const sections = [
    {
      id: 'who',
      title: 'Who is responsible for your information',
      body: (
        <>
          <p>
            {company.legalName} (registration number {company.registrationNumber}), trading as LexBridge, is the <b>responsible party</b> for personal
            information processed on LexBridge, as defined in the Protection of Personal Information Act 4 of 2013 (“POPIA”).
          </p>
          <p>
            <b>Information Officer:</b> the head of {company.legalName}, contactable at <a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a>.
            Please send all privacy questions, requests and complaints to this address.
          </p>
          <p>
            Once you appoint a practitioner, that practitioner also becomes a responsible party for the information they receive to act for you, and must protect
            it under POPIA and their professional duty of confidentiality.
          </p>
        </>
      ),
    },
    {
      id: 'collect',
      title: 'What information we collect',
      body: (
        <Table
          head={['Category', 'Examples', 'Who it is about']}
          rows={[
            ['Account details', 'Name, email address, mobile number, password (stored only as a secure hash), preferred language, role', 'All users'],
            ['Identity verification', 'Last four digits of your South African ID number and the verification result. The full ID number is checked when you submit it and is not stored', 'Users who request verification'],
            ['Practitioner credentials', 'Legal Practice Council enrolment number, practising certificate expiry, Fidelity Fund certificate, firm, areas of practice, courts, languages, photo, biography and fees', 'Practitioners'],
            ['Matters and offers', 'Matter type, description, urgency, province, budget, offers and the practitioner you choose', 'Clients and practitioners'],
            ['Engagement records', 'Consultation bookings, signed mandates with the time, IP address and fingerprint of the signature, messages, documents, invoices', 'Clients and practitioners'],
            ['Police reports', 'Incident type, date, place, summary, every version of your statement, SAPS references, investigating officer details, evidence files', 'Clients, and other people described in a statement'],
            ['Justice case records', 'Case summaries, participants, docket entries, filings, hearings, decisions, messages, Legal Aid requests, time records', 'Case participants and people referred to in records'],
            ['Payment records', 'Amount, VAT, status, payment method type and the provider’s reference. Card and bank details are handled by our payment provider, not by LexBridge', 'Clients and practitioners'],
            ['Technical information', 'IP address, browser type, the pages you use and error logs, and a session cookie that keeps you signed in', 'All visitors'],
          ]}
        />
      ),
    },
    {
      id: 'special',
      title: 'Special personal information and children',
      body: (
        <>
          <p>
            POPIA gives extra protection to “special personal information”. On LexBridge this mainly includes information about <b>criminal behaviour</b> — for
            example, a police statement describing an offence allegedly committed by someone, or records of proceedings about an offence — and sometimes{' '}
            <b>health information</b>, such as a medical report you attach as evidence.
          </p>
          <p>We process special personal information only where POPIA allows it, namely where:</p>
          <ul>
            <li>you have given your consent, which you do when you tick the consent boxes before saving a police report or opening a justice case;</li>
            <li>it is necessary to establish, exercise or defend a right or obligation in law — for example, preparing your report to SAPS or your court case; or</li>
            <li>it is otherwise permitted by POPIA or an authorisation of the Information Regulator.</li>
          </ul>
          <p>
            Access to this information is limited to you and to the people you choose or who are assigned to your case. It is never used for marketing.
          </p>
          <Callout>
            <p>
              <b>Children.</b> LexBridge is meant for adults. If a matter concerns a child, it must be posted by a parent, guardian or other competent person, who
              consents on the child’s behalf. Please share only what is necessary about the child.
            </p>
          </Callout>
        </>
      ),
    },
    {
      id: 'sources',
      title: 'Where we get information',
      body: (
        <ul>
          <li>
            <b>From you</b> — most information comes directly from you when you sign up, post a matter, save a report or use the workspace.
          </li>
          <li>
            <b>From other users</b> — for example, a practitioner’s messages and invoices, or an Official’s docket entry on your case.
          </li>
          <li>
            <b>From public sources</b> — we check practitioner credentials against the Legal Practice Council and Legal Practitioners’ Fidelity Fund records, and
            we publish court, magisterial and police station details from official government sources.
          </li>
          <li>
            <b>From our payment provider</b> — confirmation that a payment succeeded or failed.
          </li>
        </ul>
      ),
    },
    {
      id: 'purposes',
      title: 'Why we use your information and our lawful basis',
      body: (
        <Table
          head={['Purpose', 'Lawful basis under POPIA']}
          rows={[
            ['Creating and securing your account', 'Necessary to perform our agreement with you (the Terms of Use)'],
            ['Showing your anonymised matter to matching practitioners and passing on offers', 'Performing our agreement with you; your consent when you post'],
            ['Verifying practitioners and Officials', 'Our legitimate interest, and the public interest, in protecting clients from unqualified or fraudulent practitioners'],
            ['Processing payments and refunds, and keeping financial records', 'Performing our agreement; complying with tax and other laws'],
            ['Storing police reports, statement versions and evidence', 'Your consent; establishing or exercising your legal rights'],
            ['Running justice cases and notifying participants', 'Your consent and your legitimate interest in the case; Officials’ legal duties'],
            ['Moderation, fraud prevention, security and audit logs', 'Our legitimate interest in keeping the platform safe; legal obligations'],
            ['Service messages (for example, a new offer or a court date)', 'Performing our agreement with you'],
            ['Marketing messages about LexBridge', 'Only with your opt-in consent — see section 12'],
          ]}
        />
      ),
    },
    {
      id: 'voluntary',
      title: 'Is providing information voluntary?',
      body: (
        <p>
          Yes, but some information is needed to provide a service. Without a name, email address and password we cannot open an account; without a description
          of your matter practitioners cannot respond; and without practitioner credentials we cannot verify a practitioner. If you do not provide required
          information, you may not be able to use that feature. We tell you which fields are required when you fill them in.
        </p>
      ),
    },
    {
      id: 'sharing',
      title: 'Who we share information with',
      body: (
        <>
          <p>
            <b>We do not sell your personal information.</b> We share it only as follows:
          </p>
          <ul>
            <li>
              <b>Practitioners</b> see your matter without your name or contact details. The practitioner you appoint sees your name after you accept their offer,
              and your contact details after you sign the mandate.
            </li>
            <li>
              <b>Case participants</b> — on a justice case, the clients, practitioners and Officials assigned to that case can see the case records relevant to
              their role. Messages are visible only to the sender and recipient.
            </li>
            <li>
              <b>Service providers (operators)</b> who process information for us under written agreements that require them to keep it confidential and secure:
              cloud hosting, our payment provider ({company.paymentProvider}), and email or messaging providers when these are enabled.
            </li>
            <li>
              <b>Authorities</b> — SAPS, courts, regulators or others, only where the law requires it (for example, a subpoena or court order), or where needed to
              protect someone’s life or safety. We will tell you unless the law prevents us from doing so.
            </li>
            <li>
              <b>A successor business</b> — if LexBridge is sold or restructured within VINK Group, on condition that your information stays protected under
              this policy.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'cross-border',
      title: 'Information stored outside South Africa',
      body: (
        <p>
          LexBridge is hosted on cloud servers located in {company.hostingRegion}. Section 72 of POPIA allows personal information to be transferred outside South
          Africa only in certain circumstances. We transfer information only to service providers that are bound by agreements or laws that give it a level of
          protection substantially similar to POPIA, including rules about further transfers, or where the transfer is necessary to provide the service you asked
          for. By using LexBridge you are also informed of, and consent to, this transfer. If you have questions about where your data is held, contact our
          Information Officer.
        </p>
      ),
    },
    {
      id: 'security',
      title: 'How we protect your information',
      body: (
        <>
          <ul>
            <li>All connections to LexBridge are encrypted (HTTPS).</li>
            <li>Passwords are stored using a one-way hash (bcrypt); we cannot see your password.</li>
            <li>Sign-in sessions use a secure, HTTP-only cookie, and repeated failed sign-in attempts are rate-limited.</li>
            <li>Every request is checked against your role and the records you are allowed to see. Uploaded files are stored outside the public website and are only released to authorised users.</li>
            <li>Statements, docket entries, decisions and audit logs are append-only, so records cannot be secretly altered.</li>
            <li>Statements and evidence carry SHA-256 fingerprints, which are re-checked when they are displayed.</li>
            <li>Card and bank details are entered only on our payment provider’s secure page.</li>
          </ul>
          <p>
            No system is completely secure. If we have reasonable grounds to believe that your personal information has been accessed or acquired by an
            unauthorised person, we will notify the Information Regulator and you as soon as reasonably possible, as required by section 22 of POPIA, and tell
            you what we are doing and what you can do to protect yourself.
          </p>
        </>
      ),
    },
    {
      id: 'retention',
      title: 'How long we keep information',
      body: (
        <Table
          head={['Information', 'How long']}
          rows={[
            ['Account details', 'While your account is open, then up to 12 months to handle queries, unless a longer period below applies'],
            ['Matters, offers, mandates, messages and documents', '5 years after the matter closes, so that you and your practitioner can rely on the record'],
            ['Payment and financial records', '5 years after the transaction, as tax law requires'],
            [
              'Police reports, statement versions and evidence',
              'While your account is open and for 5 years after the report is closed. You may ask our Information Officer to delete a report sooner; we will, unless it is needed for a pending investigation or court case or the law requires us to keep it',
            ],
            ['Justice case records and audit logs', 'For as long as the case is active and for 5 years afterwards, or longer if a law or court order requires'],
            ['Server and security logs', 'Up to 12 months'],
          ]}
        />
      ),
    },
    {
      id: 'rights',
      title: 'Your rights',
      body: (
        <>
          <p>Under POPIA you have the right to:</p>
          <ul>
            <li>be told when your personal information is being collected, and if it has been accessed by an unauthorised person;</li>
            <li>ask whether we hold your personal information, and request a copy of it;</li>
            <li>ask us to correct, update or delete information that is inaccurate, irrelevant, excessive, out of date, incomplete, misleading or unlawfully obtained;</li>
            <li>object to processing on reasonable grounds, and object at any time to processing for direct marketing;</li>
            <li>withdraw consent you have given, without affecting processing that already took place;</li>
            <li>not to receive unsolicited electronic marketing without your consent; and</li>
            <li>complain to the Information Regulator.</li>
          </ul>
          <p>
            <b>How to use your rights:</b> email <a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a> from the email address on your account.
            Corrections to your name, phone and language can be made yourself on the <Link to="/account">Profile &amp; settings</Link> page. We may ask you to
            confirm your identity before acting. We respond within 30 days. Requests for correction or objection are free. Formal requests for access to records
            may also be made under the Promotion of Access to Information Act — see our <Link to="/legal/paia">PAIA page</Link>.
          </p>
          <Callout>
            <p>
              <b>Append-only records.</b> To protect their evidential value, earlier versions of a police statement and justice records cannot be edited. If
              something in them is wrong, we will add a correction note or a new version, and limit who can see the record, rather than change the original. We
              will explain this to you if it affects your request.
            </p>
          </Callout>
        </>
      ),
    },
    {
      id: 'marketing',
      title: 'Marketing',
      body: (
        <p>
          We send service messages that are part of using LexBridge, such as new offers, payment receipts and court dates. We send marketing messages about
          LexBridge or other VINK Group services by email, SMS or other electronic means only if you have opted in. Every marketing message tells you how to opt
          out, and you can withdraw consent at any time by emailing <a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a>.
        </p>
      ),
    },
    {
      id: 'automated',
      title: 'Automated processing',
      body: (
        <p>
          LexBridge calculates a “match” percentage to help practitioners find matters relevant to their practice, and validates the format of ID numbers you
          enter. We do not make decisions about you based solely on automated processing that have legal effects for you: you choose your practitioner,
          practitioners decide whether to respond, and verification decisions are made by people.
        </p>
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies',
      body: (
        <p>
          We use one essential cookie to keep you signed in, and do not use advertising or tracking cookies. Our <Link to="/legal/cookies">Cookie Notice</Link>{' '}
          explains this in detail.
        </p>
      ),
    },
    {
      id: 'complaints',
      title: 'Complaints to the Information Regulator',
      body: (
        <>
          <p>
            Please contact our Information Officer first so that we can try to resolve your concern. You also have the right to lodge a complaint with the
            Information Regulator at any time:
          </p>
          <Table
            head={['Information Regulator (South Africa)', '']}
            rows={[
              ['Physical address', REGULATOR.address],
              ['Postal address', REGULATOR.postal],
              ['Telephone', REGULATOR.phone],
              ['General enquiries', REGULATOR.enquiries],
              ['POPIA complaints', REGULATOR.complaints],
              [
                'Website',
                <a href={REGULATOR.web} target="_blank" rel="noreferrer">
                  inforegulator.org.za
                </a>,
              ],
            ]}
          />
          <p className="legal-fineprint">Please check the Regulator’s website for its latest contact details before writing.</p>
        </>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: (
        <p>
          We will update this policy if our practices or the law change, and notify you of material changes by email or in-app notification before they take
          effect. The “last updated” date shows when it last changed.
        </p>
      ),
    },
  ]

  return (
    <LegalDoc
      slug="privacy"
      title="Privacy Policy"
      intro="How LexBridge collects, uses, shares and protects your personal information under the Protection of Personal Information Act (POPIA)."
      summary={[
        'We collect only what we need to run the marketplace, police report tool and justice workspace.',
        'Lawyers see your matter without your name. Your contact details are shared only after you sign a mandate.',
        'Police statements can contain sensitive information about crimes, so they are visible only to you and people you choose or who are assigned to your case.',
        'We store only the last four digits of your ID number and never see your card details.',
        'We never sell your information and only send marketing if you opt in.',
        'You can ask to see, correct or delete your information, and complain to the Information Regulator.',
      ]}
      sections={sections}
    />
  )
}
