import { Link } from 'react-router-dom'
import { Callout, LegalDoc, Table } from './LegalDoc'
import { company } from '../../data/company'

export default function Refunds() {
  const sections = [
    {
      id: 'overview',
      title: 'Overview',
      body: (
        <>
          <p>
            This policy explains when you can cancel and get your money back on LexBridge. It forms part of our <Link to="/legal/terms">Terms of Use</Link>{' '}
            and reflects your rights under the Electronic Communications and Transactions Act 25 of 2002 (“ECTA”) and the Consumer Protection Act 68 of 2008
            (“CPA”). Nothing in this policy takes away a right the law gives you.
          </p>
          <Table
            head={['Situation', 'What you get back']}
            rows={[
              ['Posting a matter, receiving offers, police report tool', 'These are free — nothing is charged'],
              ['You cancel within 7 days of paying and before the consultation starts', 'Full refund (ECTA cooling-off)'],
              ['You cancel 24 hours or more before the consultation (after the 7 days)', 'Full refund'],
              ['You cancel between 2 and 24 hours before the consultation (after the 7 days)', '50% refund'],
              ['You cancel less than 2 hours before, or do not attend', 'No refund of the consultation fee'],
              ['Death or hospitalisation of the person the consultation was for', 'Full refund, whenever you cancel'],
              ['The practitioner cancels, does not attend or cannot help', 'Full refund'],
              ['A technical fault on LexBridge stops the consultation', 'Full refund or free rebooking — your choice'],
              ['Duplicate payment or wrong amount charged', 'Full refund of the amount charged in error'],
              ['Fees for legal work already done (practitioner invoices)', 'Governed by your mandate — see section 6'],
            ]}
          />
        </>
      ),
    },
    {
      id: 'free',
      title: 'Free services',
      body: (
        <p>
          Creating an account, browsing the directory, posting a matter, receiving and comparing offers, using the police report tool and case tracker, and
          using the court and police station directories are free. You will never be charged for these, so no refund is needed.
        </p>
      ),
    },
    {
      id: 'cooling-off',
      title: 'Your seven-day cooling-off right',
      body: (
        <>
          <p>
            Under section 44 of ECTA you may cancel an online agreement for services, without giving a reason and without any penalty, within seven days after
            the agreement is concluded. For a consultation booked on LexBridge, the agreement is concluded when you pay the consultation fee.
          </p>
          <p>
            <b>How it applies here:</b> if you cancel within seven days of paying and your consultation has not yet started, you get a <b>full refund</b>, even
            if the consultation is less than 24 hours away.
          </p>
          <Callout>
            <p>
              The law says the cooling-off right does not apply to services that have already begun, with your consent, before the seven days end. So once your
              consultation has taken place, the consultation fee cannot be refunded under the cooling-off right — but your other rights in this policy still
              apply if something went wrong.
            </p>
          </Callout>
          <p>
            Where you are entitled to a refund under the cooling-off right, ECTA requires it to be paid within 30 days of the date you cancel. We aim to start
            it within 5 business days.
          </p>
        </>
      ),
    },
    {
      id: 'consultations',
      title: 'Cancelling or rescheduling a consultation',
      body: (
        <>
          <p>
            Section 17 of the CPA lets you cancel an advance booking. A supplier may charge a reasonable cancellation fee, taking into account how much notice
            you gave and whether the time can be offered to someone else. Practitioners set aside consultation time for you that they usually cannot fill at
            short notice, so after the seven-day cooling-off period the following applies:
          </p>
          <Table
            head={['When you cancel (after the 7-day cooling-off period)', 'Refund of the consultation fee']}
            rows={[
              ['24 hours or more before the start time', '100%'],
              ['Between 2 and 24 hours before the start time', '50%'],
              ['Less than 2 hours before, or you do not attend', 'No refund'],
            ]}
          />
          <p>
            <b>Death or hospitalisation.</b> As the CPA requires, no cancellation charge applies if you cannot attend because the person the consultation was
            for has died or been admitted to hospital. Choose this reason when you cancel. We may ask for reasonable proof later, but we will not hold up your
            refund while we wait for it.
          </p>
          <p>
            <b>Rescheduling is free</b> if you do it at least 24 hours before the start time. Your payment stays in place and you simply choose a new time. You
            can also agree a new time directly with your practitioner in your workspace messages.
          </p>
          <p>
            <b>What cancelling means.</b> Cancelling the consultation ends that engagement with the practitioner. If you still need help, you can post your
            matter again and choose another practitioner. If you only want a different time, reschedule instead.
          </p>
          <p>
            <b>Times</b> are calculated in South African Standard Time from the start time shown on your booking.
          </p>
        </>
      ),
    },
    {
      id: 'practitioner',
      title: 'If the practitioner cancels or does not attend',
      body: (
        <p>
          If your practitioner cancels the consultation, does not attend, or tells you they cannot act for you (for example, because of a conflict of interest),
          you receive a <b>full refund</b> of the consultation fee automatically. If they only need to move the time, they can ask you to choose a new slot — you
          can accept the new time or cancel for a full refund instead.
        </p>
      ),
    },
    {
      id: 'legal-fees',
      title: 'Fees for legal work invoiced by your practitioner',
      body: (
        <>
          <p>
            After the consultation, your practitioner may send invoices through LexBridge for work under your mandate (for example, drafting or a court
            appearance). These fees are governed by the mandate between you and the practitioner, the Legal Practice Act 28 of 2014 and the Legal Practice
            Council’s rules. LexBridge is not a party to the mandate.
          </p>
          <ul>
            <li>Fees for work properly done are generally payable, even if you later end the mandate.</li>
            <li>If you think an invoice is wrong or too high, first ask your practitioner for an itemised account.</li>
            <li>
              If you still disagree, you may have the account assessed or lodge a written complaint with the Legal Practice Council provincial office where the
              practitioner practises.
            </li>
            <li>
              Use the <b>Dispute</b> button on your Payments page if a payment was processed in error, was not authorised by you, or the work invoiced was never
              agreed. We will look into it, contact the practitioner and help resolve it.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'errors',
      title: 'Payment errors and missing information',
      body: (
        <>
          <p>
            If you were charged twice, charged the wrong amount, or charged for something you did not authorise, we refund the amount charged in error in full.
          </p>
          <p>
            Section 43 of ECTA requires us to publish certain information and to let you review and correct an order before paying. If we have failed to do so,
            you may cancel the transaction within 14 days of receiving the service, and we must refund what you paid.
          </p>
        </>
      ),
    },
    {
      id: 'how',
      title: 'How to cancel or request a refund',
      body: (
        <ol>
          <li>
            <b>Cancel or reschedule a consultation:</b> open your case workspace and choose <i>Cancel consultation</i> or <i>Reschedule</i>. The refund you
            qualify for is shown before you confirm.
          </li>
          <li>
            <b>Dispute a payment:</b> go to <Link to="/payments">Payments</Link> and choose <i>Dispute</i> next to the payment, explaining what went wrong.
          </li>
          <li>
            <b>By email:</b> write to <a href={`mailto:${company.disputesEmail}`}>{company.disputesEmail}</a> with your matter reference (it starts with
            “LXB-”) and the reason. You may cancel in any recorded form — you do not have to use the app.
          </li>
        </ol>
      ),
    },
    {
      id: 'timing',
      title: 'When and how you are refunded',
      body: (
        <>
          <ul>
            <li>Refunds are paid to the payment method you used. We cannot refund to a different account or in cash.</li>
            <li>We aim to start your refund within 5 business days, and always within 30 days of your cancellation.</li>
            <li>
              Once started, banks usually take 3–10 business days to show the refund, depending on your bank and payment method. You will receive an in-app
              notification when we process it.
            </li>
            <li>No administration fee is charged for a refund.</li>
          </ul>
          <Callout>
            <p>
              <b>Test mode.</b> While LexBridge runs in test mode before live payments are enabled, no money is charged, so refunds are shown for demonstration
              only.
            </p>
          </Callout>
        </>
      ),
    },
    {
      id: 'disputes',
      title: 'Disputes and chargebacks',
      body: (
        <>
          <p>
            We acknowledge disputes within 2 business days and aim to resolve them within 10 business days. We will tell you the outcome and the reasons. If you
            are not satisfied, you may refer the matter to the Consumer Goods and Services Ombud or the National Consumer Commission.
          </p>
          <p>
            Please contact us before asking your bank for a chargeback. It is usually faster, and a chargeback may pause your account while the bank
            investigates. Your right to ask your bank for a chargeback is not affected.
          </p>
        </>
      ),
    },
  ]

  return (
    <LegalDoc
      slug="refunds"
      title="Refund & Cancellation Policy"
      intro="When you can cancel, how much you get back and how long it takes — in line with ECTA and the Consumer Protection Act."
      summary={[
        'Posting a matter and the police report tool are free.',
        'Changed your mind? Cancel within 7 days of paying, before the consultation, for a full refund.',
        'After 7 days: full refund if you cancel 24+ hours before, 50% if 2–24 hours before, none if later.',
        'Full refund if the practitioner cancels, for death or hospitalisation, or if we charged you in error.',
        'Rescheduling 24+ hours ahead is free.',
        'Refunds go back to your original payment method within 30 days, usually much sooner.',
      ]}
      sections={sections}
    />
  )
}
