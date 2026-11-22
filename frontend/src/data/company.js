// Company and contact details shown on the legal pages and footer.
// Section 43(1) of the Electronic Communications and Transactions Act requires a website
// that sells services to publish the supplier's physical address, telephone number,
// office bearers and an address for service of legal documents. Fill in the fields marked
// REQUIRED before launch — until then the pages show a "available on request" line.
export const company = {
  brand: 'LexBridge',
  legalName: 'VINK Group (Pty) Ltd',
  legalStatus: 'Private company',
  registrationNumber: '2018/079316/07',
  placeOfRegistration: 'Republic of South Africa (Companies and Intellectual Property Commission)',
  headOffice: 'Cape Town, Western Cape, South Africa',
  physicalAddress: null, // REQUIRED: street address, e.g. '1 Example Street, Cape Town, 8001'
  serviceAddress: null, // REQUIRED: address for service of legal documents (domicilium)
  phone: null, // REQUIRED: e.g. '021 000 0000'
  officeBearers: null, // REQUIRED: directors' names, e.g. 'V. Kafula (Managing Director)'
  vatNumber: null, // optional: VAT registration number, if registered
  email: 'support@lexbridge.co.za',
  privacyEmail: 'privacy@lexbridge.co.za',
  legalEmail: 'legal@lexbridge.co.za',
  disputesEmail: 'disputes@lexbridge.co.za',
  supportHours: 'Monday to Friday, 08:00–17:00 (excluding public holidays)',
  paymentProvider: 'PayFast (a Network International company)',
  hostingRegion: 'the United States',
  policiesUpdated: '22 November 2026',
}

export const onRequest = (field) =>
  company[field] ?? `Available on request from ${company.legalEmail}`
