/*
  Landing-page copy. Edit text here without touching component markup.
  Keep claims honest: this is a hackathon prototype using illustrative data.
*/

// type: 'link' scrolls to a section; 'dialog' opens an info dialog by key.
export const NAV_LINKS = [
  { label: 'Company', type: 'dialog', target: 'company' },
  { label: 'Tariff Discovery', type: 'link', target: '#tariff-discovery' },
  { label: 'Product Classification', type: 'link', target: '#product-classification' },
  { label: 'Tariff Audits', type: 'dialog', target: 'tariffAudits', planned: true },
  { label: 'Platform API', type: 'dialog', target: 'platformApi', planned: true },
  { label: 'Resources', type: 'dialog', target: 'resources' },
]

export const PERSONAS = [
  {
    initials: 'OW',
    role: 'Owner / founder',
    question: 'Is our margin at risk if freight costs jump again?',
    needs: 'A plain-language view of total exposure and which response is worth discussing first.',
    tone: 'bg-brand-100 text-brand-800',
  },
  {
    initials: 'PM',
    role: 'Procurement manager',
    question: 'Which supplier dependency should we reduce first?',
    needs: 'Supplier and region concentration, plus what a switch might cost and how long it takes.',
    tone: 'bg-sky-100 text-sky-800',
  },
  {
    initials: 'OL',
    role: 'Operations lead',
    question: 'How many days of stock do we really have if a shipment slips?',
    needs: 'Lead times, inventory cover and the gap a delay could open.',
    tone: 'bg-emerald-100 text-emerald-800',
  },
  {
    initials: 'FM',
    role: 'Finance manager',
    question: 'What does each option cost, and what assumptions sit behind it?',
    needs: 'Comparable cost estimates over the same period, with every formula visible.',
    tone: 'bg-amber-100 text-amber-800',
  },
]

export const FAQS = [
  {
    q: 'What is Waymark?',
    a: 'Waymark is a supply-chain decision platform for Canadian small and medium-sized businesses. It maps suppliers and shipments, tests disruptions, and compares sourcing options on cost, delivery, transport emissions and responsible sourcing. This hackathon build includes two fictional demo companies.',
  },
  {
    q: 'How can AI support trade planning?',
    a: 'All numbers come from a deterministic calculation engine. When an AI provider is configured, it can reword those results in plain language, but it cannot add figures of its own. Without one, Waymark uses rule-based explanations.',
  },
  {
    q: 'Does it replace our ERP or planning system?',
    a: 'No. Waymark sits alongside your existing systems. ERP integration is a configurable integration point, not a live connection.',
  },
  {
    q: 'Are classification suggestions and tariff results verified?',
    a: 'No. HS suggestions are starting points and duty rates are yours to confirm, for example with a licensed customs broker or official CBSA guidance. Waymark does not certify compliance.',
  },
  {
    q: 'What happens when business assumptions change?',
    a: 'You can edit the questionnaire answers and scenario inputs at any time, and the profile, scenario results and strategy comparison recalculate from the same inputs.',
  },
  {
    q: 'What happens on a discovery call?',
    a: 'A discovery call would be a conversation about how you plan today, your main pain points and a possible first use case. This demo does not schedule calls or collect contact details.',
  },
]

export const FOOTER_GROUPS = [
  {
    title: 'Product',
    links: [
      { label: 'Tariff Discovery', type: 'link', target: '#tariff-discovery' },
      { label: 'Product Classification', type: 'link', target: '#product-classification' },
      { label: 'Compliance Monitoring', type: 'link', target: '#compliance-monitoring' },
      { label: 'Interactive demo', type: 'demo', target: 'sample' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'For Importers', type: 'link', target: '#audience' },
      { label: 'For Exporters (roadmap)', type: 'link', target: '#audience' },
    ],
  },
  {
    title: 'Pricing',
    links: [{ label: 'Proposed pricing', type: 'dialog', target: 'pricing' }],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Waymark', type: 'dialog', target: 'company' },
      { label: 'Discovery call', type: 'dialog', target: 'discovery' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Common questions', type: 'link', target: '#faq' },
      { label: 'Newsletter', type: 'link', target: '#newsletter' },
    ],
  },
]

export const LEGAL_LINKS = [
  { label: 'Terms', target: 'terms' },
  { label: 'Privacy Policy', target: 'privacy' },
  { label: 'Security', target: 'security' },
  { label: 'Trust Center', target: 'trust' },
]

/*
  Info dialogs. `action` adds a button:
  'sample' → opens the prefilled sample walkthrough
  'questionnaire' → opens a blank questionnaire
*/
export const DIALOGS = {
  company: {
    title: 'About Waymark',
    badge: 'Hackathon prototype',
    paragraphs: [
      'Waymark is a proposed supply-chain risk and cost intelligence platform for small and medium-sized enterprises, starting with Canadian importers that do not have a dedicated supply-chain risk team.',
      'The idea combines trade-compliance assistance with practical scenario planning: understand your exposure, test what-if shocks and compare responses — starting from a short questionnaire.',
      'We help businesses prepare for uncertainty; we do not predict global events. Everything on this site is a prototype using illustrative data.',
    ],
    action: 'sample',
  },
  tariffAudits: {
    title: 'Tariff Audits',
    badge: 'Planned capability',
    paragraphs: [
      'A future capability could help review past import entries for possible classification or duty discrepancies and flag items worth discussing with a customs broker.',
      'It is not available in this prototype, and nothing here audits real import records.',
    ],
  },
  platformApi: {
    title: 'Platform API',
    badge: 'Planned capability',
    paragraphs: [
      'A future API could let teams send product and sourcing profiles from their own systems and retrieve scenario results programmatically.',
      'Enterprise integrations are configurable integration points. None are live connections today.',
    ],
  },
  resources: {
    title: 'Resources',
    paragraphs: ['Helpful places to start in this prototype:'],
    links: [
      { label: 'Common questions', target: '#faq' },
      { label: 'Newsletter (demo only)', target: '#newsletter' },
      { label: 'Who Waymark is for', target: '#audience' },
    ],
    action: 'sample',
  },
  signIn: {
    title: 'Sign in',
    badge: 'Not available in prototype',
    paragraphs: [
      'Sign in from the account page.',
      'You can explore the full journey with a fictional sample company instead — no account or personal details needed.',
    ],
    action: 'sample',
  },
  signUp: {
    title: 'Sign up',
    badge: 'Not available in prototype',
    paragraphs: [
      'Account creation is not available in this prototype, and no details are collected.',
      'Try the questionnaire or the sample walkthrough instead. Your answers stay in this browser tab and are cleared when you reset or close it.',
    ],
    action: 'questionnaire',
  },
  discovery: {
    title: 'Discovery call (sample)',
    badge: 'No booking is made',
    paragraphs: ['In a real engagement, a discovery call would be a short conversation covering:'],
    bullets: [
      'How you plan purchasing and inventory today',
      'Where disruptions or cost changes have hurt most',
      'Which decision a first scenario report should help with',
      'What data you would be comfortable sharing, and when',
    ],
    footnote: 'This demo does not schedule calls, collect contact details or send any messages.',
    action: 'sample',
  },
  pricing: {
    title: 'Proposed pricing',
    badge: 'Unvalidated hypothesis',
    paragraphs: ['Our current business-model hypothesis is freemium:'],
    bullets: [
      'Free: questionnaire, preliminary profile and a basic scenario',
      'Paid: additional scenarios, saved comparisons and shareable reports',
      'Later: data integrations and team features',
    ],
    footnote:
      'Prices and willingness to pay have not been validated with customers. There is no payment integration in this prototype.',
  },
  terms: {
    title: 'Terms',
    badge: 'Prototype information',
    paragraphs: [
      'This site is a hackathon prototype provided for demonstration only. Outputs are illustrative estimates and are not financial, legal, customs or compliance advice.',
      'No formal terms of service have been drafted for this prototype.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    badge: 'Prototype information',
    paragraphs: [
      'Demo and local workspaces are stored in your browser. Coordinates and place names are sent to weather, geocoding and emissions services through the Waymark server when those features run.',
      'The newsletter form does not store or send your email address.',
      'A formal privacy policy would be required before collecting any real business data. Lower-data onboarding reduces — but does not eliminate — privacy risk.',
    ],
  },
  security: {
    title: 'Security',
    badge: 'Prototype information',
    paragraphs: [
      'Demo and local workspaces stay in your browser. Real accounts need a configured Supabase project, where row-level security separates the data of each company. API keys stay on the server.',
      'No security certifications or guarantees are claimed. A production version would need a proper security review.',
    ],
  },
  trust: {
    title: 'Trust Center',
    badge: 'Prototype information',
    paragraphs: [
      'Our approach for the prototype: label fictional and hypothetical data clearly, show every formula, and keep working features separate from planned ones.',
      'There are no audits, certifications or compliance attestations to report.',
    ],
  },
}

/*
  Scroll-story scenes on the homepage (visual storytelling only — no new
  product claims). Scene visuals live in src/components/trade-visuals/.
*/
export const STORY_SCENES = [
  {
    kicker: 'Ocean freight',
    title: 'Weeks at sea between order and arrival.',
    body: 'Long ocean legs mean purchasing decisions are made well before goods land — and conditions can change on the way.',
  },
  {
    kicker: 'Transportation networks',
    title: 'Every hand-off adds time and cost.',
    body: 'Ocean, rail and air connect at ports and hubs. Each link carries its own freight cost and lead time.',
  },
  {
    kicker: 'Uncertainty',
    title: 'When one link shifts, the plan moves with it.',
    body: 'A slower lane or a cost change ripples into landed cost and stock cover. Waymark lets you test those shifts as hypothetical scenarios.',
    note: 'Illustrative route change — not a real event or forecast.',
  },
  {
    kicker: 'Business clarity',
    title: 'From a short questionnaire to options you can compare.',
    body: 'Build a preliminary profile, explore what-if scenarios and compare practical responses — with every assumption visible.',
  },
]
