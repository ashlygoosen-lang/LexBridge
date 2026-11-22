import { Link } from 'react-router-dom'
import { Callout, Def, LegalDoc, Table } from './LegalDoc'
import { company, onRequest } from '../../data/company'

const L = ({ to, children }) => <Link to={to}>{children}</Link>

export default function Terms() {
  const sections = [
    {
      id: 'about',
      title: 'Who we are and how these terms work',
      body: (
        <>
          <p>
            LexBridge is an online legal marketplace and case-management platform operated by <b>{company.legalName}</b> (registration number{' '}
            {company.registrationNumber}), a {company.legalStatus.toLowerCase()} registered in South Africa. LexBridge is a division of {company.legalName}.
            In these terms “LexBridge”, “we”, “us” and “our” mean {company.legalName}, trading as LexBridge.
          </p>
          <p>
            These Terms of Use (“terms”) form a binding agreement between you and us when you visit the website, create an account or use any LexBridge
            service. Please read them carefully. By ticking the box when you sign up, or by continuing to use the platform, you confirm that you have read,
            understood and accepted them. If you do not agree, please do not use LexBridge.
          </p>
          <p>
            These terms must be read with our <L to="/legal/privacy">Privacy Policy</L>, <L to="/legal/refunds">Refund &amp; Cancellation Policy</L>,{' '}
            <L to="/legal/cookies">Cookie Notice</L> and, for legal practitioners, our <L to="/legal/practitioners">Practitioner Terms</L>. Our company and
            contact details, as required by section 43 of the Electronic Communications and Transactions Act 25 of 2002 (“ECTA”), are set out in{' '}
            <a href="#company-info">section 24</a> and on our <L to="/legal/company">Company Information</L> page.
          </p>
        </>
      ),
    },
    {
      id: 'important',
      title: 'Important notices — please read these first',
      body: (
        <>
          <p>
            The Consumer Protection Act 68 of 2008 (“CPA”) requires us to draw your attention to terms that limit our responsibility, place risk on you or
            require you to indemnify us. These terms are written in bold or highlighted below, and the most important ones are summarised here:
          </p>
          <Callout tone="warn">
            <ul>
              <li>
                <b>LexBridge is not a law firm and does not give legal advice.</b> We connect you with independent, verified legal practitioners. Legal
                advice comes only from the practitioner you choose, under the mandate you sign with them.
              </li>
              <li>
                <b>LexBridge is not the South African Police Service (SAPS) or a court.</b> A report prepared on LexBridge is not an official criminal case.
                Only SAPS can open a case and issue a CAS number, and only a court can issue court orders.
              </li>
              <li>
                <b>In an emergency, call SAPS on 10111</b> (or 112 from a cell phone). For gender-based violence, call the GBV Command Centre on 0800 428 428.
                Do not wait for a response on LexBridge.
              </li>
              <li>
                <b>The practitioner you appoint is responsible for the legal services they provide.</b> We verify credentials but do not supervise their
                work. Our liability is limited as set out in <a href="#liability">section 18</a>.
              </li>
              <li>
                <b>Police statements and justice records are kept permanently as an append-only record.</b> You can add corrections, but you cannot delete
                the original. See <a href="#police">section 10</a>.
              </li>
            </ul>
          </Callout>
        </>
      ),
    },
    {
      id: 'definitions',
      title: 'Definitions',
      body: (
        <>
          <Def term="Client">means a person who uses LexBridge to look for legal help, post a matter, prepare a police report or take part in a case as a party.</Def>
          <Def term="Practitioner">means an attorney or advocate admitted and enrolled under the Legal Practice Act 28 of 2014, whose profile has been verified by us.</Def>
          <Def term="Official">means a user we have given an official role on the justice workspace — for example a SAPS official, prosecutor, court clerk, magistrate or Legal Aid practitioner — after confirming their identity and authority.</Def>
          <Def term="Matter">means a description of a legal problem that a Client posts so that Practitioners can respond with offers.</Def>
          <Def term="Offer">means a Practitioner’s response to a Matter, setting out a consultation fee, an estimate of further fees and what is included.</Def>
          <Def term="Mandate">means the engagement agreement between a Client and the Practitioner they choose, which the Client signs electronically on LexBridge.</Def>
          <Def term="Police report">means the information and statement a Client records with the LexBridge police report tool to prepare for reporting a matter to SAPS.</Def>
          <Def term="Justice workspace">means the role-based area where Clients, Practitioners and Officials work on a digital case intake.</Def>
          <Def term="Content">means anything you add to LexBridge, including text, statements, messages, documents, images and evidence.</Def>
        </>
      ),
    },
    {
      id: 'accounts',
      title: 'Who may use LexBridge and your account',
      body: (
        <>
          <p>
            <b>Age and capacity.</b> You must be 18 or older, or have the assistance and consent of a parent or legal guardian, to create an account. If you
            use LexBridge for a company or organisation, you confirm that you are authorised to bind it to these terms.
          </p>
          <p>
            <b>Accurate information.</b> You must give true, accurate and complete information and keep it up to date. You may hold only one personal
            account. Do not create an account for someone else without their authority.
          </p>
          <p>
            <b>Account security.</b> Keep your password secret and do not share your account. You are responsible for activity on your account unless you
            show that it happened without your fault (for example, after you told us your account was compromised). Tell us immediately at{' '}
            <a href={`mailto:${company.email}`}>{company.email}</a> if you suspect unauthorised use.
          </p>
          <p>
            <b>Roles.</b> Anyone may sign up as a Client or apply as a Practitioner. Practitioner profiles only become visible after verification. Official
            roles (SAPS, prosecution, court and Legal Aid) cannot be self-selected — they are assigned by LexBridge after we confirm the person’s identity and
            authority.
          </p>
          <p>
            <b>Identity verification.</b> Some features ask you to submit your South African ID number for manual verification. We check the number’s format
            when you submit it and store only the last four digits.
          </p>
        </>
      ),
    },
    {
      id: 'service',
      title: 'What LexBridge does — and what it does not do',
      body: (
        <>
          <p>LexBridge provides an online platform that lets you:</p>
          <ul>
            <li>search a directory of verified legal practitioners and view their profiles, areas of practice, languages and consultation fees;</li>
            <li>post a Matter anonymously and receive Offers from matching Practitioners;</li>
            <li>compare Offers, accept one, pay a consultation fee, book a consultation and sign a Mandate online;</li>
            <li>work with your Practitioner in a secure workspace — messages, documents, dates, invoices and payments;</li>
            <li>prepare a police report, keep every version of your statement, record a SAPS reference and track the matter to court;</li>
            <li>take part in a digital justice case with assigned Officials; and</li>
            <li>use public directories of courts, magisterial districts and police stations.</li>
          </ul>
          <p>
            <b>Practitioners are independent.</b> Practitioners are not our employees, partners or agents. They decide whether to respond to a Matter, what to
            charge and how to run your matter, subject to the Legal Practice Act and the Legal Practice Council’s Code of Conduct. We do not guarantee the
            outcome of any matter.
          </p>
          <p>
            <b>What verification means.</b> Before a Practitioner can respond to Matters, we check their Legal Practice Council enrolment, practising status,
            Fidelity Fund certificate (where required) and firm details. Verification confirms these credentials at the time we check them. It is not a
            recommendation of the Practitioner’s skill or a guarantee of their conduct. Practitioners must tell us of any change, and we re-check credentials
            when they are updated or expire.
          </p>
          <p>
            <b>Matching and match scores.</b> We show Practitioners a “match” percentage based on the matter type, province and court you selected. It helps
            Practitioners find relevant Matters; it does not decide anything for you. You always choose your Practitioner.
          </p>
        </>
      ),
    },
    {
      id: 'matters',
      title: 'Posting a matter',
      body: (
        <>
          <p>
            Posting a Matter is free. Your Matter is shown to verified Practitioners <b>without your name or contact details</b>. Please describe the facts
            in your own words and <b>do not include ID numbers, names of other people, addresses, case numbers or other identifying details</b> in the public
            description — you can share those privately with your Practitioner once you have appointed them.
          </p>
          <p>You may withdraw an open Matter at any time before you accept an Offer. Matters must not:</p>
          <ul>
            <li>contain false information, or be posted to collect Offers for a purpose other than finding legal help;</li>
            <li>include defamatory, threatening, hateful or discriminatory content, or personal information about other people that is not necessary;</li>
            <li>ask a Practitioner to do something unlawful or unethical; or</li>
            <li>advertise goods or services.</li>
          </ul>
          <p>
            Our moderation team may pause a Matter that breaks these rules and will tell you why so that you can correct it. Pausing a Matter hides it from
            Practitioners; it does not delete it.
          </p>
        </>
      ),
    },
    {
      id: 'offers',
      title: 'Offers, choosing a practitioner and the mandate',
      body: (
        <>
          <p>
            <b>Offers are estimates.</b> An Offer sets out the Practitioner’s consultation fee, an estimate of further fees broken down by stage, the fee
            structure and what is included. All amounts are shown in South African rand and include VAT where the Practitioner is VAT-registered. Further fees
            are estimates: legal work can change as a matter develops. A Practitioner must tell you in writing before exceeding the estimate.
          </p>
          <p>
            <b>Accepting an Offer.</b> When you accept an Offer, other Offers on that Matter are declined automatically. You then pay the consultation fee,
            choose a consultation time and sign the Mandate. You can review every detail — the Practitioner, fees, scope and terms — and correct mistakes
            before you pay or sign.
          </p>
          <p>
            <b>The Mandate is between you and your Practitioner.</b> LexBridge is not a party to the Mandate and is not responsible for performing it. Your
            electronic signature is recorded with the date, time and a tamper-evident fingerprint, and is valid under ECTA. You can view and print the signed
            Mandate in your workspace at any time.
          </p>
          <p>
            <b>Your contact details</b> are shared with your Practitioner only after you sign the Mandate, so that they can act for you.
          </p>
          <p>
            <b>Fee disputes with a Practitioner</b> are governed by the Mandate, the Legal Practice Act and the Legal Practice Council’s rules. You may ask
            your Practitioner for an itemised account and, if you disagree with it, have it assessed or lodge a complaint with the Legal Practice Council (see{' '}
            <a href="#complaints">section 21</a>).
          </p>
        </>
      ),
    },
    {
      id: 'fees',
      title: 'Fees, payments and VAT',
      body: (
        <>
          <Table
            head={['What', 'Who pays', 'Cost']}
            rows={[
              ['Creating an account, searching the directory, posting a Matter, receiving Offers', 'Client', 'Free'],
              ['Police report tool, statement history and case tracker', 'Client', 'Free'],
              ['Consultation fee', 'Client, to the Practitioner', 'As shown on the Offer, including VAT where applicable'],
              ['Further legal fees invoiced by the Practitioner', 'Client, to the Practitioner', 'As agreed in the Mandate'],
              ['Court directories, magistrate finder and police station directory', 'Anyone', 'Free'],
            ]}
          />
          <p>
            <b>How payment works.</b> Payments are processed by our payment provider, {company.paymentProvider}. You are redirected to the provider’s secure
            payment page to pay by card, instant EFT or another supported method. <b>LexBridge never sees or stores your full card or bank account details.</b>{' '}
            Payments made through LexBridge are paid over to the Practitioner you appointed. We act only as a limited agent to collect the payment on the
            Practitioner’s behalf.
          </p>
          <p>
            <b>No referral fees.</b> LexBridge does not take a share of Practitioners’ fees and does not charge Practitioners for referring clients to them.
            The fee you see on an Offer is the Practitioner’s fee.
          </p>
          <p>
            <b>Records.</b> Every payment appears on your Payments page with the date, amount, VAT and status. You can download or print this record at any
            time while your account is open, and ask us for a copy for up to five years afterwards.
          </p>
          <p>
            <b>Test mode.</b> Before live payments are enabled, the platform may run in a clearly labelled test mode in which no money is charged.
          </p>
        </>
      ),
    },
    {
      id: 'cancellations',
      title: 'Cancellations and refunds',
      body: (
        <>
          <p>
            Your cancellation and refund rights — including the seven-day cooling-off right under section 44 of ECTA and your rights under section 17 of the
            CPA — are set out in full in our <L to="/legal/refunds">Refund &amp; Cancellation Policy</L>, which forms part of these terms. In summary:
          </p>
          <ul>
            <li>You can cancel a consultation for a full refund within seven days of paying, as long as the consultation has not yet taken place.</li>
            <li>After that, cancelling at least 24 hours before the consultation gives a full refund; later cancellations may carry a cancellation charge.</li>
            <li>If the Practitioner cancels or does not attend, you get a full refund.</li>
            <li>Refunds are paid back to your original payment method within 30 days, and we aim to start them within 5 business days.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'police',
      title: 'The police report tool',
      body: (
        <>
          <Callout tone="warn">
            <p>
              <b>A LexBridge police report is not an official SAPS case.</b> It helps you prepare and preserve your account. To report a crime officially you
              must go to, or contact, SAPS. SAPS will give you a CAS or occurrence-book reference, which you can then record on LexBridge. We do not verify the
              references you record.
            </p>
          </Callout>
          <p>
            <b>Your statement is preserved.</b> When you save a report, your original statement is locked. Corrections and new information are added as new,
            numbered versions. Every version is kept with its date, time and a SHA-256 fingerprint so that you can show it has not been changed. Neither you
            nor we can edit or delete earlier versions. This protects the evidential value of your record.
          </p>
          <p>
            <b>Tell the truth.</b> Only record what you personally saw, heard or experienced, and separate facts from assumptions. Knowingly giving false
            information to the police is a criminal offence.
          </p>
          <p>
            <b>Information about other people.</b> A statement may describe other people, including alleged offenders. Record only what is needed to describe
            what happened. Our <L to="/legal/privacy">Privacy Policy</L> explains how we protect this information.
          </p>
          <p>
            <b>Evidence.</b> Files you attach are fingerprinted when uploaded. Keep the originals safe — SAPS or a court may ask for them.
          </p>
        </>
      ),
    },
    {
      id: 'justice',
      title: 'The digital justice workspace',
      body: (
        <>
          <p>
            The justice workspace lets Clients, Practitioners and Officials work on a digital case intake. Platform references (starting “JUST-”) are not
            official CAS or court numbers. Official numbers, docket entries, hearings and decisions recorded on LexBridge reflect what authorised Officials
            entered; the official record remains the one held by SAPS, the National Prosecuting Authority, the courts and the Department of Justice.
          </p>
          <p>
            Officials must act within their lawful authority and only on cases they are assigned to. Docket entries, sealed decisions and audit records are
            append-only. Everyone on a case can see the case activity relevant to them, and messages are visible only to their sender and recipient.
          </p>
          <p>
            Requesting Legal Aid screening through LexBridge sends your request to a Legal Aid practitioner on the platform. Approval is not guaranteed and is
            subject to Legal Aid South Africa’s eligibility criteria.
          </p>
        </>
      ),
    },
    {
      id: 'information',
      title: 'Directories and general information',
      body: (
        <p>
          Court contacts, magisterial district data, police station details, fee guidance and court-process explanations are general information taken from
          official public sources, with the source and date shown. Details such as commanders, registrars and telephone numbers change. Always confirm with the
          office concerned before travelling or filing documents. This information is not legal advice and does not replace advice from a Practitioner about
          your situation.
        </p>
      ),
    },
    {
      id: 'conduct',
      title: 'Acceptable use',
      body: (
        <>
          <p>When using LexBridge you must not:</p>
          <ul>
            <li>break any law, or use LexBridge to harass, threaten, defame, stalk or discriminate against anyone;</li>
            <li>impersonate another person, a Practitioner, SAPS or any official, or misrepresent your authority;</li>
            <li>upload content you do not have the right to share, or that contains malware;</li>
            <li>try to get around anonymity — for example, by asking for a Client’s contact details before a Mandate is signed;</li>
            <li>take a relationship that started on LexBridge off the platform in order to avoid these terms, or solicit Clients or Practitioners for another service;</li>
            <li>scrape, copy or harvest data, test or bypass our security, or overload the platform; or</li>
            <li>use automated tools to create accounts, post Matters or send Offers.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'content',
      title: 'Your content',
      body: (
        <>
          <p>
            You keep ownership of your Content. You give us a non-exclusive, royalty-free licence to store, process, display and transmit it only as needed to
            run LexBridge for you — for example, to show your Matter to Practitioners or your documents to the people you share them with.
          </p>
          <p>
            You are responsible for your Content and confirm that you have the right to share it. We may remove Content that breaks these terms or the law, but
            we do not alter append-only records; where needed we restrict access to them instead.
          </p>
        </>
      ),
    },
    {
      id: 'ip',
      title: 'Intellectual property',
      body: (
        <p>
          The LexBridge name, logo, website design, software and original text belong to {company.legalName} or its licensors and are protected by law. You may
          use the platform for its intended purpose and print pages for your own records, but you may not copy, modify, distribute or create derivative works
          from it without our written permission. Public-sector data shown in directories remains subject to the terms of its original source.
        </p>
      ),
    },
    {
      id: 'privacy',
      title: 'Privacy and security',
      body: (
        <p>
          We process personal information in line with the Protection of Personal Information Act 4 of 2013 (“POPIA”), as explained in our{' '}
          <L to="/legal/privacy">Privacy Policy</L>. We use reasonable technical and organisational measures to protect the platform and our payment process,
          including encrypted connections, hashed passwords, access controls and audit logs, and we use a payment provider that meets accepted industry
          security standards.
        </p>
      ),
    },
    {
      id: 'availability',
      title: 'Availability and changes to the platform',
      body: (
        <p>
          We work to keep LexBridge available and secure, but we cannot promise uninterrupted or error-free service. We may need to suspend parts of the
          platform for maintenance, security or reasons outside our control. We will try to give notice of planned downtime. We may improve or change features;
          if a change materially reduces a paid service you have already bought, you may cancel it and receive a refund for the part not yet provided.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'Limitation of liability',
      body: (
        <>
          <Callout tone="warn">
            <p>
              <b>Please read this section carefully. It limits our responsibility to you.</b>
            </p>
          </Callout>
          <p>
            <b>
              To the extent permitted by law, LexBridge is not liable for: (a) the advice, acts or omissions of any Practitioner or Official; (b) the outcome of
              any legal matter, police investigation or court case; (c) loss caused by inaccurate information in public directories or in Content provided by
              other users; or (d) indirect or consequential loss, such as loss of profit or opportunity, arising from your use of LexBridge.
            </b>
          </p>
          <p>
            <b>
              Where we are liable to you, our total liability for any claim is limited to the amount you paid through LexBridge in the twelve months before the
              claim arose, or R1 000, whichever is greater.
            </b>
          </p>
          <p>
            Nothing in these terms limits or excludes our liability for gross negligence, wilful misconduct or fraud, for death or personal injury caused by our
            negligence, or any liability or right that cannot be limited or waived under the CPA, ECTA or any other law. If you are a consumer under the CPA,
            your statutory rights are not affected.
          </p>
        </>
      ),
    },
    {
      id: 'indemnity',
      title: 'Indemnity',
      body: (
        <p>
          <b>
            To the extent permitted by law, you agree to indemnify LexBridge against claims by third parties that arise because you broke these terms, broke
            the law or infringed someone else’s rights through your Content.
          </b>{' '}
          This does not apply to the extent that the claim was caused by our own fault.
        </p>
      ),
    },
    {
      id: 'termination',
      title: 'Suspension and closing your account',
      body: (
        <>
          <p>
            You may close your account at any time by emailing <a href={`mailto:${company.email}`}>{company.email}</a>. Closing your account does not cancel a
            Mandate you have signed with a Practitioner; you must end that with the Practitioner directly.
          </p>
          <p>
            We may suspend or close an account, after giving notice and a chance to respond where reasonable, if the user seriously or repeatedly breaks these
            terms, gives false information, puts others at risk or acts unlawfully. We may act immediately where necessary to protect users or comply with the
            law. We may suspend a Practitioner whose credentials can no longer be verified.
          </p>
          <p>
            After an account closes, we keep records we are required to keep by law, and append-only case records, as explained in our{' '}
            <L to="/legal/privacy">Privacy Policy</L>.
          </p>
        </>
      ),
    },
    {
      id: 'complaints',
      title: 'Complaints and disputes',
      body: (
        <>
          <p>We want to resolve problems quickly and fairly. Please use these routes:</p>
          <Table
            head={['Your complaint is about', 'Where to go first', 'If unresolved']}
            rows={[
              [
                'LexBridge’s service, a payment or a refund',
                <>
                  The Payments page (“Dispute”) or <a href={`mailto:${company.disputesEmail}`}>{company.disputesEmail}</a>. We acknowledge within 2 business days
                  and aim to resolve within 10.
                </>,
                'The Consumer Goods and Services Ombud or the National Consumer Commission',
              ],
              [
                'How we handle your personal information',
                <>
                  Our Information Officer at <a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a>
                </>,
                <>
                  The Information Regulator — see our <L to="/legal/privacy">Privacy Policy</L>
                </>,
              ],
              [
                'A Practitioner’s conduct or fees',
                'The Practitioner directly, and tell us so that we can review their profile',
                'The Legal Practice Council provincial office where the Practitioner practises. Complaints must be in writing with supporting documents.',
              ],
              ['A police official', 'The station commander', 'SAPS complaints channels or the Independent Police Investigative Directorate (IPID)'],
            ]}
          />
          <p>
            These terms are governed by the laws of the Republic of South Africa. You may approach any South African court with jurisdiction, including the
            Magistrates’ Court, and you keep any right you have to approach a consumer tribunal or ombud.
          </p>
        </>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      body: (
        <p>
          We may update these terms to reflect changes in the law or our services. We will tell you about material changes by email or in-app notification at
          least 14 days before they take effect. If you do not agree to a change, you may close your account before it takes effect, and we will refund any
          payment for a service not yet provided. The “last updated” date at the top shows when the terms last changed.
        </p>
      ),
    },
    {
      id: 'general',
      title: 'General',
      body: (
        <ul>
          <li>
            <b>Electronic agreement.</b> These terms are concluded electronically and are valid under ECTA. You can print or save them at any time using the
            button at the top of this page.
          </li>
          <li>
            <b>Notices.</b> We send notices to the email address on your account and through in-app notifications. You may send notices to{' '}
            <a href={`mailto:${company.legalEmail}`}>{company.legalEmail}</a>. Formal legal documents must be served at our address for service in section 24.
          </li>
          <li>
            <b>Severability.</b> If any part of these terms is found invalid, the rest remains in force.
          </li>
          <li>
            <b>No waiver.</b> If we do not enforce a right immediately, we may still enforce it later.
          </li>
          <li>
            <b>Entire agreement.</b> These terms and the policies they refer to are the whole agreement between you and LexBridge about the platform. The
            Mandate governs your relationship with your Practitioner.
          </li>
        </ul>
      ),
    },
    {
      id: 'company-info',
      title: 'Our details (ECTA section 43)',
      body: (
        <Table
          head={['', '']}
          rows={[
            ['Full name and legal status', `${company.legalName}, ${company.legalStatus.toLowerCase()}, trading as ${company.brand}`],
            ['Registration number and place of registration', `${company.registrationNumber} · ${company.placeOfRegistration}`],
            ['Head office', company.headOffice],
            ['Physical address', onRequest('physicalAddress')],
            ['Address for service of legal documents', onRequest('serviceAddress')],
            ['Telephone', onRequest('phone')],
            ['Email', company.email],
            ['Directors / office bearers', onRequest('officeBearers')],
            ['Website', typeof window !== 'undefined' ? window.location.origin : 'LexBridge website'],
            ['Payment methods', `Card, instant EFT and other methods offered by ${company.paymentProvider}`],
            ['Privacy policy and payment security', <L to="/legal/privacy">Privacy Policy</L>],
            ['Return, cancellation and refund policy', <L to="/legal/refunds">Refund & Cancellation Policy</L>],
            ['Codes of conduct', 'Practitioners on LexBridge are bound by the Legal Practice Council Code of Conduct'],
          ]}
        />
      ),
    },
  ]

  return (
    <LegalDoc
      slug="terms"
      title="Terms of Use"
      intro="The agreement between you and LexBridge when you use our website and services. Written to be read — please take a few minutes."
      summary={[
        'LexBridge connects you with independent, verified lawyers. We are not a law firm, not SAPS and not a court.',
        'Posting a matter and using the police report tool are free. You pay a lawyer only once you choose them.',
        'Your contract for legal services is with the lawyer you choose, set out in the mandate you sign.',
        'You can cancel a consultation for a full refund within 7 days of paying if it hasn’t happened yet.',
        'Police statements are kept as a permanent, tamper-evident record. You can add corrections but not delete the original.',
        'We protect your information under POPIA and never sell it.',
      ]}
      sections={sections}
    />
  )
}
