// Full Golf CRM Research Data for Landing Page Report Showcase
// Source: Research ID 63bf4009 (Golf CRM project)
// Every field from the research pipeline is included — nothing omitted.

/* ════════════════════════════════════════════════════════
   TAB CONFIGURATION
   ════════════════════════════════════════════════════════ */
export const REPORT_TABS = [
  { id: 'scores', label: 'Scores' },
  { id: 'market', label: 'Market' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'pain', label: 'Pain Points' },
  { id: 'positioning', label: 'Strategy' },
  { id: 'timing', label: 'Timing' },
  { id: 'business', label: 'Business' },
  { id: 'blueprint', label: 'Blueprint' },
] as const;

/* ════════════════════════════════════════════════════════
   SCORES
   ════════════════════════════════════════════════════════ */
export const SCORES = [
  { label: 'Opportunity', value: 78, maxValue: 100 },
  { label: 'Problem', value: 80, maxValue: 100 },
  { label: 'Feasibility', value: 61, maxValue: 100 },
  { label: 'Why Now', value: 86, maxValue: 100 },
];

export const SCORE_JUSTIFICATIONS = {
  opportunity: {
    score: 78,
    confidence: 'high' as const,
    justification:
      'The market size is substantial at $634M-$936M globally with strong 8-9% CAGR growth, and North America alone represents $254M with 40% market share. The golf travel market reached $25B in 2024, providing a massive addressable market. Key positive signals include: 35 of Top 100 European resorts already using specialized golf CRM (proving enterprise adoption), active market share shifts away from legacy vendors (Lightspeed +7%, Club Caddie +20%), and demonstrated ROI (Sand Valley generated tens of thousands in incremental revenue in one month). However, the score is pulled down by significant fragmentation — top players Clubessential (41%) and Jonas (37%) already dominate premium facilities, creating high switching costs.',
  },
  problem: {
    score: 80,
    confidence: 'low' as const,
    justification:
      'The research reveals severe, well-documented pain points that operators actively complain about. Critical problems include: (1) U.S. courses waste $100M annually (6M staff-hours) on phone inquiries yet only 25% explore digital solutions, (2) Resorts cobble together disconnected systems requiring \'expensive custom integration\' and still lack native golf features, (3) Multi-course and vacation packages require \'ugly workarounds\' with no natural booking flow, (4) System outages directly cost revenue (one course had bookings down for months), (5) Operators explicitly state frustration being \'fed up with how poor all online tee time reservation systems are.\'',
  },
  feasibility: {
    score: 61,
    confidence: 'high' as const,
    justification:
      'Building a golf-specific CRM is technically achievable but faces substantial challenges. Integration complexity is severe — must connect with top 5 golf POS systems, top 3 property management systems, tee-sheet engines, payment processors, and Google\'s booking API. One data point shows just database integration costs $9K-$17K with 6-8 week rollout. Domain expertise requirements are high — must understand golf-specific workflows (member pricing, tee-time rules, shotgun starts, tournament management). The competitive landscape includes well-funded players with significant resources. Sales cycles are long (12-18 months for enterprise) and require deep industry relationships.',
  },
  whyNow: {
    score: 86,
    confidence: 'high' as const,
    justification:
      'Timing is very strong with multiple converging catalysts creating urgency. Market is in active transition with legacy vendors (foreUP, Teesnap) losing share while modern platforms gain 7-20% growth — buyers are switching NOW. Google launched Golf Tee Time integration forcing courses to adopt third-party booking or lose search traffic. Post-COVID golf demand stabilized at elevated levels with guests booking 12 months ahead and expecting complex packages. 70% of facilities now need booking beyond tee times (simulators, dining, lodging) exceeding legacy system capabilities. The window is finite — major hospitality players are beginning to enter golf tech and market will likely consolidate around 2-3 dominant platforms within 18-24 months.',
  },
};

export const SCORE_METADATA = {
  flagged: false,
  passCount: 3,
  maxDeviation: 13,
  averageConfidence: 94,
};

/* ════════════════════════════════════════════════════════
   MARKET ANALYSIS
   ════════════════════════════════════════════════════════ */
export const MARKET_ANALYSIS = {
  size: 'The golf course management software market is valued at approximately $634 million globally in 2024, with North America representing roughly 40% ($254 million) and Europe approximately 29% ($182 million). Another forecast including all club-management functions estimates the market at $936 million in 2024.',
  growth:
    'The market is growing at approximately 8.2% annually, projected to reach $1.19 billion by 2032. Alternative forecasts show 9.3% CAGR reaching $2.5 billion by 2035. North America leads with 40% market share and steady growth, while Asia-Pacific represents the fastest-growing segment with projected 10%+ CAGR.',
  keyMetrics: {
    cagr: '8.2% to 9.3% CAGR from 2024 to 2032-2035',
    avgDealSize:
      'Destination resorts: $50,000-$60,000 annually. Standalone courses: $2,400-$6,000 annually.',
  },
  dynamics: {
    stage: 'growing' as const,
    consolidationLevel:
      'Fragmented but consolidating. Top players Clubessential (41%) and Jonas (37%) dominate premium facilities, while numerous smaller cloud-based providers compete for mid-market.',
    regulatoryEnvironment:
      'No specific regulatory constraints — operates under standard software, hospitality, and payment processing regulations.',
    entryBarriers: [
      'Integration complexity with existing golf operations systems (tee sheets, POS, property management, F&B, spa booking)',
      'Established vendor relationships and high switching costs at premium facilities',
      'Network effects from booking platforms like GolfNow covering 9,000 courses',
      'Capital requirements for comprehensive feature sets across CRM, booking, payments, analytics, and mobile',
      'Sales cycle complexity requiring deep golf industry knowledge',
    ],
  },
  trends: [
    'Cloud-based and mobile-first platforms are rapidly gaining market share. Lightspeed/Golf grew ~7% in early 2025 while Club Caddie grew 20%, whereas legacy systems experienced declining market share.',
    'Consolidation toward all-in-one platforms is accelerating, exemplified by Lightspeed\'s 2019 acquisition of Chronogolf to create unified systems covering tee sheets, pro shop POS, restaurant F&B, and property management.',
    'Private and resort golf courses lead software adoption driven by higher investment capacity and customer expectations for premium services.',
    'Advanced analytics and marketing automation are becoming standard requirements, with operators seeking real-time data analytics and cloud-based solutions.',
    'Market fragmentation persists with operators stitching together disparate tools: generic enterprise CRMs, specialized tee-sheet engines, and separate booking engines.',
  ],
  threats: [
    'Established vendors dominate: Clubessential serves 20,000 club locations globally and holds 41% market share among Top 100 course organizations, while Jonas controls 37%.',
    'Major hospitality POS vendors expanding into golf through acquisition and integration, bringing significant capital and cross-selling capabilities.',
    'GolfNow\'s booking network covers ~9,000 courses worldwide, providing substantial network effects difficult for new entrants to replicate.',
    'Smaller public and municipal courses have limited IT budgets (often only a few hundred dollars per month) and are slow to adopt.',
    'Heavy customization requirements and integration complexity create high implementation costs and extended sales cycles.',
  ],
  opportunities: [
    'U.S. courses burn ~$100 million annually (6 million staff-hours) on phone inquiry handling, yet only 25% are exploring digital booking/chat solutions.',
    'Resorts currently overpay for generic CRMs requiring tens of thousands of dollars annually in licenses and consulting, plus $2-3K/month for separate tee-sheet and POS subscriptions.',
    'No dominant single player owns the entire guest booking journey from inquiry to itinerary to payment.',
    'Destination resorts and premium facilities have larger IT budgets and willingness to invest in integrated platforms.',
    'Growing demand for unified booking systems that share tee-time availability across multiple clubs with upfront payment capabilities.',
  ],
  adjacentMarkets: [
    { name: 'Hospitality Property Management Systems (PMS)', relevance: 'Golf resorts require integrated lodging management alongside golf operations.' },
    { name: 'Restaurant and F&B Management Software', relevance: 'Golf facilities typically include pro shops, restaurants, and banquet facilities.' },
    { name: 'Sports and Recreation Facility Management', relevance: 'Many golf resorts offer tennis, spa, fitness, and other recreational activities.' },
    { name: 'Travel and Tourism Booking Platforms', relevance: 'Golf vacations represent a significant tourism segment.' },
    { name: 'Event and Tournament Management Software', relevance: 'Golf courses host numerous tournaments, corporate outings, and group events.' },
  ],
};

/* ════════════════════════════════════════════════════════
   MARKET SIZING
   ════════════════════════════════════════════════════════ */
export const MARKET_SIZING = {
  tam: { value: 634, formatted: '$634M', growth: '8.2%', confidence: 'medium' as const, timeframe: '2024-2032' },
  sam: { value: 436, formatted: '$436M', growth: '8.0%', confidence: 'medium' as const, timeframe: '2024-2032' },
  som: { value: 3.2, formatted: '$3.2M', growth: '8.0%', confidence: 'low' as const, timeframe: '2024-2029' },
  methodology:
    'TAM is the published 2024 global golf course management software market; SAM applies published NA+Europe regional shares to TAM. SOM is an estimated 0.5% share of the 2029 SAM projected using the cited CAGR.',
  segments: [
    { name: 'Resorts & destination courses', samContribution: 35, somContribution: 50, tamContribution: 30, description: 'Golf resorts needing complex package booking, tee-time orchestration, and guest CRM across on-property revenue centers.' },
    { name: 'Private clubs', samContribution: 45, somContribution: 40, tamContribution: 40, description: 'High-budget clubs adopting integrated cloud systems for member CRM, tee sheets, POS, and communications.' },
    { name: 'Public & municipal courses', samContribution: 20, somContribution: 10, tamContribution: 30, description: 'Price-sensitive facilities gradually upgrading tee-time and operations software to improve efficiency.' },
  ],
  geographic: [
    { region: 'North America', percentage: 40, notes: 'Largest share; mature market with strong adoption at premium and resort facilities.' },
    { region: 'Europe', percentage: 29, notes: 'Steady growth; meaningful installed base seeking modern cloud-based platforms.' },
    { region: 'Rest of World', percentage: 31, notes: 'Smaller today; Asia-Pacific fastest growth driven by emerging golf tourism.' },
  ],
  assumptions: [
    'TAM uses global golf course management software market size of $634M (2024).',
    'Market definition includes tee-time scheduling, membership/CRM modules, POS, and integrated operations tools.',
    'TAM growth rate uses published 8.2% CAGR through 2032.',
    'SAM targets reachable near-term go-to-market in North America and Europe.',
    'SAM value equals NA (40%) + Europe (29%) of TAM = 69% of $634M = $436M.',
    'SAM CAGR approximated at 8.0% using global (8.2%) and Europe (7.6%) indicators.',
    'SOM assumes 0.5% share of SAM achievable within 3-5 years (conservative, <1%).',
    'SOM computed on projected 2029 SAM: $436M × (1.08^5) = $640.6M; 0.5% = $3.2M.',
    'Initial traction expected from private and resort courses, which lead software adoption.',
  ],
  sources: [
    { title: 'Golf Course Management Software Market (size, CAGR, regional shares)', date: '2024', reliability: 'secondary' as const },
    { title: 'Golf Course Management Software Market (North America share reference)', date: '2024', reliability: 'secondary' as const },
    { title: 'Golf Course Management Software Market (Europe share and growth reference)', date: '2024', reliability: 'secondary' as const },
    { title: 'Adoption note: private and resort courses lead adoption', date: '2024', reliability: 'secondary' as const },
    { title: 'Tee-sheet/booking engine market moves (vendor share shifts)', date: '2025', reliability: 'secondary' as const },
  ],
};

/* ════════════════════════════════════════════════════════
   COMPETITORS
   ════════════════════════════════════════════════════════ */
export const COMPETITORS = [
  {
    name: 'Lightspeed Golf (Chronogolf)',
    pricingModel: 'Free software via payment processing revenue share (~15%)',
    targetSegment: 'Public and private golf courses',
    fundingStage: 'Public company',
    estimatedRevenue: 'Not specified',
    description: 'Leading all-in-one cloud golf management platform with modern tee sheet, dynamic pricing, POS, online booking, membership database, marketing tools, and event management. Serves ~2,000 courses globally and is gaining market share.',
    strengths: [
      'Market leader with ~2,000 courses globally (+60 accounts in early 2025)',
      'Tight tee-sheet/POS integration with unified payments system',
      'Modern cloud architecture with comprehensive feature set',
      'No startup costs — charges via payment processing',
      'Successfully taking share from legacy providers',
    ],
    weaknesses: [
      'Very expensive when full functionality is needed — requires add-ons',
      'UX issues reported — \'not user friendly...as if the designer never worked in a golf shop\'',
      'Slow performance on large shotgun tournaments',
      'No multi-course trip/itinerary management capabilities',
    ],
    vulnerability: 'High total cost of ownership when add-ons required, UX complexity, no multi-course vacation/trip booking',
    keyDifferentiator: 'Unified payments with tight POS/tee-sheet integration and modern cloud architecture',
  },
  {
    name: 'Club Caddie (Jonas/Horizon)',
    pricingModel: '$299/month subscription',
    targetSegment: 'Private clubs and high-end resorts',
    fundingStage: 'Acquired by Jonas Software',
    estimatedRevenue: 'Not specified',
    description: 'Cloud suite built by golf industry veterans. Includes tee-time booking, POS/inventory, member management, F&B/event planning, plus website and custom mobile-app development with 28 app modules. Trusted by 35 of Top 100 Continental Europe golf resorts.',
    strengths: [
      'Deep golf-centric feature set built by industry veterans',
      'Managed website and mobile app building with 28 customizable modules',
      '35 of Top 100 Continental Europe resorts use sister product',
      'End-to-end tools covering all aspects of golf operations',
    ],
    weaknesses: [
      'Steep pricing at ~$299/month (2.5x higher than foreUP)',
      'Trustpilot reviewer called web UI \'the worst end-user experience\' of any booking system',
      'No multi-course trip management functionality',
    ],
    vulnerability: 'High pricing, poor web UI/UX experience, complexity alienates mid-market',
    keyDifferentiator: 'Managed website/app services with 28 modules for branded customer experience',
  },
  {
    name: 'foreUP (GolfNow Group)',
    pricingModel: '$120/month starting price',
    targetSegment: 'Public courses and clubs',
    fundingStage: 'Part of GolfNow Group',
    estimatedRevenue: 'Declining',
    description: 'Cloud POS/tee-sheet/CRM system aimed at public courses and clubs. Offers unified POS, tee sheet, membership billing, marketing, and reports. Rapidly losing market share.',
    strengths: [
      'Low pricing at ~$120/month',
      'Easy to learn for basic operations',
      'Part of GolfNow ecosystem — distribution advantages',
      'Historically broad adoption with 1,700+ North American customers',
    ],
    weaknesses: [
      'Rapidly losing market share — dropped ~68 clubs in early 2025',
      'Missing features — \'inventory and payment processing are lacking\'',
      'Spotty customer support reported by users',
      'Reliability issues causing customer churn',
      'No multi-course trip/vacation management',
    ],
    vulnerability: 'Losing market share due to missing features, poor support, and reliability — customers actively switching',
    keyDifferentiator: 'Low-cost entry point with basic all-in-one functionality',
  },
  {
    name: 'Salesforce-based Solutions (Booking Ninjas)',
    pricingModel: 'Custom enterprise — $9K-$17K integration + six-figure implementation',
    targetSegment: 'Large resorts and enterprise golf operations',
    fundingStage: 'Enterprise platform',
    estimatedRevenue: 'Not specified',
    description: 'Enterprise CRM platforms with heavy golf-specific customizations. Booking Ninjas offers Salesforce-native golf management suite. Large travel operators like Golfbreaks have built custom Salesforce apps for tour bookings.',
    strengths: [
      'Can centralize all data across departments',
      'Highly customizable to specific needs',
      'Enterprise-grade reliability and scalability',
      'Proven for complex tour booking operations (Golfbreaks case)',
    ],
    weaknesses: [
      'Extremely high costs — $9K-$17K just for database integration',
      '6-8 week rollout at nearly six figures total implementation',
      'Requires costly consultants for implementation and maintenance',
      'Still lacks golf-native trip/tee-time features despite customization',
      'Overkill for most golf operations',
    ],
    vulnerability: 'Prohibitively expensive for 95% of market, requires consultants, lacks golf-native workflows',
    keyDifferentiator: 'Enterprise Salesforce platform with full organizational data centralization',
  },
  {
    name: 'Golfluent',
    pricingModel: '$49/week (~$200/month) Essentials plan',
    targetSegment: 'Local golf retailers, instructors, small golf businesses',
    fundingStage: 'Startup',
    estimatedRevenue: 'Small-scale',
    description: 'All-in-one marketing/CRM specifically for golf businesses, handling leads, scheduling, payments, reviews, and email/SMS communication. Aimed at local golf retailers and instructors.',
    strengths: [
      'Golf-specific CRM understanding industry workflows',
      'Affordable at ~$200/month including 700 free SMS/emails',
      'Purpose-built for golf business operations',
    ],
    weaknesses: [
      'Aimed at retailers and instructors, not resorts',
      'Lacks real tee-sheet integration',
      'Handles only simpler use cases (appointments/leads)',
      'Not designed for resort-scale operations',
    ],
    vulnerability: 'Not designed for course operations or resort-scale bookings — completely different market',
    keyDifferentiator: 'Golf-specific marketing and customer communication automation for small businesses',
  },
  {
    name: 'Legacy Tee-Sheet Systems (Teesnap, Tee-On)',
    pricingModel: 'Not specified',
    targetSegment: 'Existing customers resistant to change',
    fundingStage: 'Legacy',
    estimatedRevenue: 'Declining',
    description: 'Traditional tee-sheet management systems rapidly losing market share to modern cloud competitors. Outdated technology and limited feature sets.',
    strengths: [
      'Established presence with existing customer base',
      'Familiar to long-time golf operations staff',
    ],
    weaknesses: [
      'Rapidly losing market share to modern competitors',
      'Outdated technology and architecture',
      'Limited feature sets compared to modern platforms',
      'Poor UX by current standards',
      'Customers actively migrating away',
    ],
    vulnerability: 'Outdated technology causing rapid customer loss',
    keyDifferentiator: 'Established presence and familiarity',
  },
  {
    name: 'Niche Providers (TeeWire, TeeQuest)',
    pricingModel: '$100-$179/month (varies)',
    targetSegment: 'Small courses seeking simple, affordable management',
    fundingStage: 'Small companies',
    estimatedRevenue: 'Small-scale',
    description: 'Smaller cloud-based tee-sheet and POS providers. TeeWire offers bare-bones cloud tee-sheet at $149-$179/month with no contracts. TeeQuest provides cloud POS/tee-sheet rated highly (~4.9 on Capterra).',
    strengths: [
      'Simple, predictable pricing with no contracts',
      'High customer satisfaction (TeeQuest ~4.9 on Capterra)',
      'Focused feature sets keeping operations simple',
    ],
    weaknesses: [
      'Smaller market presence and limited resources',
      'Bare-bones feature sets lacking advanced capabilities',
      'No full CRM or trip/itinerary features',
      'Per-user pricing can scale expensively',
    ],
    vulnerability: 'Limited feature depth prevents serving complex resort or multi-course operations',
    keyDifferentiator: 'Simplicity and low cost with no long-term contracts',
  },
  {
    name: 'Generic Trip Platforms (WeTravel)',
    pricingModel: 'Not specified',
    targetSegment: 'Tour operators across industries',
    fundingStage: 'Not specified',
    estimatedRevenue: 'Not specified',
    description: 'Generic trip and tour management platforms used by some golf tour operators to build multi-round itineraries with payment plans. Remain completely disconnected from course management systems.',
    strengths: [
      'Multi-day itinerary building capabilities',
      'Payment plan management for complex bookings',
      'Proven in general travel/tour industry',
    ],
    weaknesses: [
      'Not golf-specific — lacks industry workflows',
      'Completely disconnected from course tee-sheet systems',
      'Requires manual coordination between trip platform and course systems',
      'Operators resort to spreadsheets and emails for actual coordination',
    ],
    vulnerability: 'Zero integration with golf operations — creates manual work and coordination gaps',
    keyDifferentiator: 'Multi-day trip itinerary and payment management',
  },
];

/* ════════════════════════════════════════════════════════
   PAIN POINTS (20 validated)
   ════════════════════════════════════════════════════════ */
export const PAIN_POINTS = [
  {
    problem: 'Current tee-sheet and reservation systems are fundamentally poor and frustrating to use',
    severity: 'high' as const,
    affectedSegment: 'Golf managers and golfers',
    evidenceQuote: '"A few of us flatly admitted they\'re \'fed up with how poor all of the online tee time reservation systems are\'"',
    costOfInaction: 'Lost bookings, customer attrition, staff time wasted on workarounds',
  },
  {
    problem: 'Golfers must create separate login credentials for every golf course they want to book',
    severity: 'high' as const,
    affectedSegment: 'Golfers booking tee times',
    evidenceQuote: '"Courses \'no longer take reservations over the phone\' and now make players juggle separate logins for every site"',
    costOfInaction: 'Abandoned bookings, reduced customer satisfaction',
  },
  {
    problem: 'Clubs must cobble together separate systems requiring expensive custom integration',
    severity: 'high' as const,
    affectedSegment: 'Golf course managers',
    evidenceQuote: '"Many clubs cobble together Salesforce-based CRMs plus third-party booking/tee-sheet tools, then pay dearly to custom-bolt them together"',
    costOfInaction: 'High ongoing integration costs, technical debt',
  },
  {
    problem: 'Separating booking engines from POS creates double-entry work and reconciliation nightmares',
    severity: 'high' as const,
    affectedSegment: 'Accounting and operations staff',
    evidenceQuote: '"Many courses don\'t want to separate their booking engine from their point of sale system — doing so makes end-of-month accounting a nightmare"',
    costOfInaction: 'Staff time wasted, accounting errors, delayed reporting',
  },
  {
    problem: 'Traditional golf-booking vendors use harsh commission structures "killing clubs" financially',
    severity: 'high' as const,
    affectedSegment: 'Golf club owners and financial managers',
    evidenceQuote: '"An Irish club member blasted the industry-standard BRS system as \'horrible\' and warned that its pricing \'is killing clubs\'"',
    costOfInaction: 'Reduced profitability, potential financial distress',
  },
  {
    problem: 'Clubs pay for expensive generic CRM customizations plus gateway/tee-sheet fees while still missing native golf features',
    severity: 'high' as const,
    affectedSegment: 'Golf resort operators',
    evidenceQuote: '"Clubs feel stuck paying for expensive generic CRM customizations plus gateway/tee-sheet fees, yet still missing native golf features they need"',
    costOfInaction: 'High software costs, operational inefficiency',
  },
  {
    problem: 'Major software updates get pushed through at critical times causing system failures during busy morning operations',
    severity: 'high' as const,
    affectedSegment: 'Pro shop staff and course operators',
    evidenceQuote: '"Major software updates \'got pushed through at really bad times\' so they \'couldn\'t operate the software smoothly\' during busy morning hours"',
    costOfInaction: 'Lost revenue during outages, customer complaints',
  },
  {
    problem: 'Systems become slow and buggy when handling large tournament data',
    severity: 'high' as const,
    affectedSegment: 'Tournament coordinators',
    evidenceQuote: '"At times the software [is] slow and buggy when working with large tournament data, especially when adding dozens of shotgun groups at once"',
    costOfInaction: 'Extended setup time, errors in tournament configuration',
  },
  {
    problem: 'Staff cannot see a player\'s membership status on the tee sheet, making them feel incompetent',
    severity: 'high' as const,
    affectedSegment: 'Pro shop staff',
    evidenceQuote: '"This limitation made staff \'feel incompetent\' because they only learn club status at checkout"',
    costOfInaction: 'Staff embarrassment, customer service issues, pricing errors',
  },
  {
    problem: 'Loyalty programs, cart rentals, league play, and bundled golf vacation packages require ugly workarounds',
    severity: 'high' as const,
    affectedSegment: 'Golf resorts offering packages',
    evidenceQuote: '"Loyalty programs, cart rentals, league play sign-ups and bundled \'golf vacation\' packages often require ugly workarounds"',
    costOfInaction: 'Manual errors, lost upsell opportunities',
  },
  {
    problem: 'Tee-time engines don\'t handle multi-course or all-inclusive bookings naturally',
    severity: 'high' as const,
    affectedSegment: 'Golf resorts with multiple courses',
    evidenceQuote: '"Complaints about mismatched guest counts, inability to apply member rates mid-booking, or split-cart billing occur regularly"',
    costOfInaction: 'Complex manual processes, booking errors',
  },
  {
    problem: 'Systems lack native golf logic for member pricing, tee-time rules, shotgun starts, and tournament workflows',
    severity: 'high' as const,
    affectedSegment: 'All golf course types, particularly member clubs',
    evidenceQuote: '"Others note missing features like shotgun start workflows or tournament checklists simply don\'t exist without custom coding"',
    costOfInaction: 'Pricing errors, rule violations, tournament setup complexity',
  },
  {
    problem: 'System outages and reliability issues directly cause lost tee times and revenue',
    severity: 'high' as const,
    affectedSegment: 'All courses dependent on online booking',
    evidenceQuote: '"One course had its online reservations down for months, requiring manual phone bookings"',
    costOfInaction: 'Direct revenue loss, customer attrition, reputation damage',
  },
  {
    problem: 'Systems lack key golf features entirely or hide them in convoluted workflows',
    severity: 'high' as const,
    affectedSegment: 'All golf course operational staff',
    evidenceQuote: '"Existing systems either lack key golf features entirely or hide them in convoluted workflows, forcing staff into manual coordination"',
    costOfInaction: 'Operational inefficiency, increased error rates',
  },
  {
    problem: 'Pricing information is incomplete, non-intuitive, and lacks common rate types',
    severity: 'medium' as const,
    affectedSegment: 'Golfers and course operators',
    evidenceQuote: '"Provided rates are often incomplete and non-intuitive (no easy senior-walk-on rate, etc.)"',
    costOfInaction: 'Lost revenue, increased phone inquiries',
  },
  {
    problem: 'Convenience fees and strict deposit rules force customers to pay for all expected players even if someone cancels',
    severity: 'medium' as const,
    affectedSegment: 'Golfers booking group tee times',
    evidenceQuote: '"\'Convenience fees\' or strict deposit rules drive further ire"',
    costOfInaction: 'Customer dissatisfaction, reduced group bookings',
  },
  {
    problem: 'Core tasks require too many steps and clicks, particularly during peak check-in times',
    severity: 'medium' as const,
    affectedSegment: 'Pro shop front desk staff',
    evidenceQuote: '"During peak check-in times staff feel bogged down clicking through screens and wish for a dual tee-sheet/sales view"',
    costOfInaction: 'Customer wait times, staff stress',
  },
  {
    problem: 'Group event confirmations and reservations functionality is difficult to understand',
    severity: 'medium' as const,
    affectedSegment: 'Event coordinators',
    evidenceQuote: '"It has many functionalities so it makes it difficult to understand… still improvements needed in confirmations and group reservations"',
    costOfInaction: 'Booking errors, missed confirmations',
  },
  {
    problem: 'Built-in reporting and analytics are insufficient — staff must export to Excel',
    severity: 'medium' as const,
    affectedSegment: 'Golf course managers and owners',
    evidenceQuote: '"They have to export tee-sheet data to Excel because the built-in reports \'are still missing some of the really special information\'"',
    costOfInaction: 'Poor business intelligence, delayed decision-making',
  },
  {
    problem: 'System unnecessarily prints receipts for annual members on every round, wasting paper',
    severity: 'low' as const,
    affectedSegment: 'Clubs with annual membership programs',
    evidenceQuote: '"foreUP unnecessarily printing a receipt for every annual-member round (\'a waste of paper\' for non-pay customers)"',
    costOfInaction: 'Paper costs, minor staff annoyance',
  },
];

/* ════════════════════════════════════════════════════════
   POSITIONING
   ════════════════════════════════════════════════════════ */
export const POSITIONING = {
  uniqueValueProposition:
    'The only CRM purpose-built for golf vacation resorts and destination courses that unifies multi-course trip planning, complex group bookings, and granular tee-time management in one platform — eliminating the spreadsheets, disconnected systems, and six-figure Salesforce implementations that plague the industry today.',
  targetAudience:
    'Golf vacation resorts, destination courses, and multi-property golf operators who manage complex multi-day packages, group bookings across multiple courses, and need granular control over tee times and customer relationships without enterprise-level costs or complexity.',
  differentiators: [
    'Native multi-course trip/itinerary management integrated directly with tee-sheet operations',
    'Complex group booking workflows handling simultaneous multi-course reservations in one system',
    'Golf vacation-specific CRM capturing the full customer journey from inquiry to package completion',
    'Granular tee-time control at resort/destination scale without Salesforce\'s six-figure costs',
    'Purpose-built for vacation/destination golf operations vs. single-course daily-fee focus',
    'Unified system eliminating spreadsheet/email coordination operators currently endure',
  ],
  messagingPillars: [
    'End the spreadsheet chaos: Multi-course vacation management in one platform',
    'Golf-native complexity: Handle intricate group bookings and packages that generic CRMs can\'t',
    'Destination-scale power without enterprise costs: Get Salesforce capabilities at mid-market pricing',
    'Real-time coordination: Connect trip planning directly to tee-sheet availability across properties',
  ],
  messagingFramework: {
    headline: 'The Golf Vacation CRM That Finally Connects Trip Planning to Tee Times',
    subheadline: 'Purpose-built for destination courses and resorts managing complex multi-course packages — without the spreadsheets or six-figure Salesforce bills.',
    elevatorPitch:
      'Golf resorts lose revenue and waste countless hours coordinating multi-course vacation packages across disconnected systems, spreadsheets, and email threads. Golf CRM is the first platform purpose-built for destination golf operations — unifying trip planning, complex group bookings, and granular tee-time management in one system. We deliver the power of enterprise golf management at mid-market pricing, so resorts can capture more vacation revenue without the operational chaos.',
    objectionHandlers: [
      { objection: 'We already use Lightspeed/foreUP for our tee sheet', response: 'Lightspeed and foreUP are excellent for single-course daily operations, but they weren\'t built for multi-course vacation packages. We integrate with your existing tee-sheet while adding the vacation/trip layer that\'s missing.' },
      { objection: 'Can\'t we just customize Salesforce for this?', response: 'You can — for $100K+ in implementation costs, 6-8 weeks of rollout, and ongoing consultant fees. Even then, integrators admit Salesforce "lacks golf-native trip/tee-time features." We built those features from day one.' },
      { objection: 'Our operation isn\'t that complex', response: 'If you\'re managing multi-day packages, coordinating tee times across multiple courses, or handling group bookings with custom itineraries, you\'re already dealing with complexity — you\'ve just normalized the manual work.' },
      { objection: 'What about Club Caddie? They handle resorts.', response: 'Club Caddie is strong for private club operations, but at $299/month with "worst end-user experience" web UI, and they still don\'t offer true multi-course trip management.' },
      { objection: 'We can\'t afford to switch systems right now', response: 'Most operations directors spend 20+ hours/week on spreadsheet coordination. Our implementation pays for itself in 60-90 days through time savings and captured revenue.' },
    ],
  },
  idealCustomerProfile: {
    persona: 'Resort Golf Operations Director',
    demographics: 'Golf resorts with 2-5+ courses, destination golf properties, $2M-$50M annual revenue, 10-100 staff, $50K-$500K software budgets',
    buyingTriggers: [
      'Lost a major group booking due to coordination failure between systems',
      'Expanding to multi-course operations or acquiring additional properties',
      'Customer complaints about booking complexity or errors',
      'Operations director spending 20+ hours/week on manual coordination',
      'Evaluating expensive Salesforce implementation and seeking alternatives',
      'Competitor resort launches superior online booking for golf vacations',
    ],
    psychographics: 'Frustrated by juggling disconnected systems. Losing revenue to booking errors and manual coordination overhead. Fears losing groups to competitors with better booking experiences. Skeptical of generic platforms that promise golf capabilities but deliver complexity.',
  },
  competitivePositioning: {
    category: 'Golf Vacation & Destination Course CRM',
    against: 'Unlike Lightspeed and foreUP (built for single-course daily operations) or Salesforce (requiring six-figure implementations), we deliver purpose-built multi-course vacation management with granular tee-time control at a fraction of enterprise costs.',
    proofPoint: 'Current operators manage multi-day golf vacations via spreadsheets and emails because no existing platform connects trip planning to actual tee-sheet operations.',
    anchorBenefit: 'Eliminate manual coordination and capture more vacation revenue by managing complex multi-course packages in one golf-native system.',
  },
};

/* ════════════════════════════════════════════════════════
   WHY NOW
   ════════════════════════════════════════════════════════ */
export const WHY_NOW = {
  urgencyScore: 85,
  catalysts: [
    { event: 'Continued labor shortage forcing automation adoption across hospitality', impact: 'high' as const, timeframe: 'Ongoing through 2025-2026', howToLeverage: 'Position CRM as staff-multiplier that automates routine tasks. Quantify ROI in staff-hours saved (e.g., eliminating 6M wasted phone hours industry-wide).' },
    { event: 'Google Golf Tee Time integration requiring third-party booking engine compatibility', impact: 'high' as const, timeframe: 'Active now, adoption accelerating 2025', howToLeverage: 'Build native Google integration as core feature, market as \'Google-ready\' to capture search-driven bookings.' },
    { event: 'Resort guests increasingly bundling multiple activities into single trips', impact: 'high' as const, timeframe: 'Trend accelerating 2024-2025', howToLeverage: 'Emphasize unified itinerary management across golf, lodging, F&B, spa, and cultural activities.' },
    { event: 'Off-course golf formats (simulators, Topgolf-style bays) outpacing traditional play', impact: 'medium' as const, timeframe: '73% growth since 2019, continuing', howToLeverage: 'Design CRM to handle both on-course and off-course bookings in single platform.' },
    { event: 'Market share shift away from legacy vendors (foreUP, Teesnap declining)', impact: 'high' as const, timeframe: 'Active transition 2024-2025', howToLeverage: 'Target dissatisfied customers of legacy vendors with migration services.' },
  ],
  timingFactors: [
    'Post-COVID demand stabilized at elevated levels with guests booking complex multi-activity packages 12+ months ahead',
    '76% of consumers expect personalized experiences and feel let down without them',
    '45% of core golfers report feeling treated like \'just another customer\' (NGF data)',
    'Industry consensus: \'digital convenience is now a baseline expectation at the course\'',
    '35 of Top 100 Golf Resorts in Continental Europe already trust specialized golf management CRM',
    'Sand Valley generated 100+ incremental tee times (400+ rounds) in one month via new waitlist technology',
    'Buyers actively prioritizing integrated features like marketing automation and dynamic pricing',
  ],
  marketTriggers: [
    'Golf travel market reached $25 billion in 2024 with no signs of slowing',
    'Booking lead times returned to pre-COVID levels — guests booking up to one year in advance',
    '70% of North American golf facilities now have booking needs beyond tee times',
    'Off-course golf: 27.9M vs 25.6M participants — simulator play jumped 73% since 2019',
    'Market share actively shifting: Lightspeed +7%, Club Caddie +20% in recent surveys',
    'Google launched Golf Tee Time add-on enabling direct booking from search results',
    'U.S. courses waste 6 million staff-hours annually just answering basic phone inquiries',
  ],
  urgencyNarrative:
    'The golf resort technology market is in a rare transition window where legacy vendors are losing share, buyers are actively switching systems, and new requirements exceed existing solutions\' capabilities. The window to establish a specialized golf CRM before market consolidation is 18-24 months.',
  windowOfOpportunity: {
    opens: '2024-2025 (currently open)',
    closesBy: '2026-2027',
    reasoning: 'Market is in active transition phase with legacy vendors losing share and buyers actively evaluating new platforms. Early movers can capture enterprise customers before market consolidates around 2-3 dominant specialized platforms.',
  },
};

/* ════════════════════════════════════════════════════════
   PROOF SIGNALS & VALIDATION
   ════════════════════════════════════════════════════════ */
export const PROOF_SIGNALS = {
  demandStrength: {
    score: 82,
    spendingSignal: 'Operators demonstrably switching systems multiple times to find suitable platforms. Sand Valley paying for Noteefy and generating tens of thousands in incremental revenue proves ROI-positive spending.',
    communitySignal: 'Golf course operators publicly discussing system switches and technology needs in trade publications and LinkedIn posts. Vendors reporting immediate results and operator testimonials.',
    searchVolumeSignal: 'Industry publications actively covering golf technology trends with multiple articles in 2024-2025 on booking systems, CRM needs, and digital transformation.',
  },
  demandIndicators: [
    '$25 billion golf travel market size in 2024 with continued growth trajectory',
    '70% of Lightspeed\'s North American golf customers have booking needs beyond tee times',
    '35 of Top 100 Continental European golf resorts already using specialized golf CRM',
    'Sand Valley booked 100+ incremental tee times (400+ rounds) in one month — \'tens of thousands in incremental revenue\'',
    'One GM switched tee-sheet systems three times seeking a platform that could handle non-golf bookings',
    'Guests booking up to one year in advance — complex long-term reservation management needed',
    '76% of consumers expect personalized experiences, 45% of core golfers feel treated like \'just another customer\'',
    'Modern platforms gaining 7-20% market share while legacy vendors decline',
    'Industry explicitly states tournaments, weddings, corporate outings \'require tailored tech tools\'',
    'Courses adding non-golf amenities that \'demand unified booking systems\'',
  ],
  riskFactors: [
    'Established hospitality CRM vendors may build or acquire golf-specific modules',
    'Market may consolidate before new entrant can achieve scale',
    'Golf resorts may have 12-18 month enterprise sales cycles',
    'Integration complexity with existing systems may create high implementation costs',
    'Switching costs from legacy systems may be higher than anticipated',
    'Seasonal nature of golf business may create cash flow challenges',
    'Market may be more fragmented than appears — different needs across segments',
    'Dependence on third-party integrations creates technical risk',
    'Labor shortage may also affect golf resort IT staff',
    'Economic downturn could reduce discretionary golf travel spending',
  ],
  riskMitigation: [
    { risk: 'Established vendors building golf modules', severity: 'high' as const, mitigation: 'Move quickly to sign 10-15 flagship resort customers and build deep golf-specific features that generic CRMs cannot easily replicate.' },
    { risk: 'Long enterprise sales cycles', severity: 'high' as const, mitigation: 'Start with smaller destination courses with faster decision cycles. Offer pilot programs with quick wins implementable in 30-60 days.' },
    { risk: 'High integration complexity', severity: 'medium' as const, mitigation: 'Build pre-built integrations with top 5 golf POS systems and top 3 property management systems. Offer white-glove implementation as premium tier.' },
    { risk: 'Market fragmentation requiring multiple product variants', severity: 'medium' as const, mitigation: 'Focus initial product on destination resorts (highest complexity, highest willingness to pay). Build modular architecture that can scale down.' },
    { risk: 'Switching costs higher than anticipated', severity: 'medium' as const, mitigation: 'Offer data migration services and parallel-run period. Target courses already dissatisfied with current vendor.' },
    { risk: 'Economic downturn reducing budgets', severity: 'medium' as const, mitigation: 'Emphasize cost-saving features that improve margins during downturn. Offer flexible pricing tied to booking volume.' },
  ],
  validationExperiments: [
    { experiment: 'Feature comparison landing page with Google/LinkedIn ads targeting golf operations managers', cost: '$2,000-3,000', timeframe: '2-3 weeks', hypothesis: 'If 5%+ sign up for early access and 20%+ respond to follow-up survey, demand is validated' },
    { experiment: 'Cold outreach to 50 golf resorts that recently switched tee-sheet systems', cost: '$500', timeframe: '3-4 weeks', hypothesis: 'If 20%+ take consultation call and 50%+ express interest in unified CRM, pain point is validated' },
    { experiment: 'Clickable prototype demoed to 10-15 resort managers at golf industry conference', cost: '$3,500', timeframe: '4-6 weeks', hypothesis: 'If 60%+ say they would trial this solution, product-market fit is validated' },
    { experiment: 'Free Google Golf Tee Time integration for 5 courses in exchange for testimonials', cost: '$3,000', timeframe: '6-8 weeks', hypothesis: 'If integration drives 10%+ booking increase, value proposition is validated' },
    { experiment: 'Partner with one pilot resort for basic unified booking implementation', cost: '$5,000-8,000', timeframe: '8-12 weeks', hypothesis: 'If pilot shows 20%+ staff time reduction, ROI case is validated' },
  ],
  validationOpportunities: [
    'Interview 20-30 golf resort managers at destination courses',
    'Conduct feature prioritization survey with golf resort operators',
    'Build landing page and run targeted ads to golf resort decision-makers',
    'Attend golf industry conferences (PGA Show, Golf Inc. Strategy Summit)',
    'Partner with 2-3 pilot resorts for MVP focused on unified booking',
    'Analyze job postings from golf resorts for technology requirements',
    'Survey recent switchers from legacy tee-sheet systems',
    'Test Google Golf Tee Time integration as standalone service',
    'Interview vendors of complementary services (Noteefy, Loop Golf)',
    'Analyze customer reviews of existing platforms to identify feature gaps',
  ],
};

/* ════════════════════════════════════════════════════════
   REVENUE POTENTIAL
   ════════════════════════════════════════════════════════ */
export const REVENUE_POTENTIAL = {
  rating: 'high' as const,
  confidence: 85,
  estimate: '$2-5M ARR within 3 years',
  revenueModel: 'SaaS subscriptions — Premium: $30K-$40K/yr for destination resorts; Mid-tier: $6K-$12K/yr for standalone courses; optional 1-2% transaction fees on bookings',
  unitEconomics: 'Target LTV:CAC of 5:1 to 7:1. With $35K avg annual contract and 5-year lifetime, LTV = $175K. CAC target: $15K-$25K. Gross margins: 75-85%.',
  timeToFirstRevenue: '6-9 months post-launch. Enterprise sales cycles require 3-6 months from initial contact to contract, plus 1-3 months implementation.',
};

/* ════════════════════════════════════════════════════════
   EXECUTION DIFFICULTY
   ════════════════════════════════════════════════════════ */
export const EXECUTION = {
  rating: 'hard' as const,
  soloFriendly: false,
  mvpTimeEstimate: '9-12 months for viable enterprise MVP; solo founder would need 18+ months',
  biggestRisk: 'Integration complexity and fragmentation. With no standard APIs across tee-sheet systems, POS platforms, and property management systems, each deployment may require custom integration work.',
  factors: [
    'Complex integration requirements with existing tee-sheet, POS, property management, and F&B platforms',
    'Enterprise sales cycles of 3-6 months to resort decision-makers',
    'High switching costs at premium facilities with tens of thousands invested in customizations',
    'Building comprehensive feature set requires 12-18 month development timeline',
    'Deep domain expertise required: golf operations, resort management, group booking workflows',
    'Competitive pressure from well-capitalized players (Lightspeed acquired Chronogolf, GolfNow\'s 9,000-course network)',
  ],
  criticalPath: [
    'Secure 3-5 design partner resorts (months 1-3)',
    'Build core CRM with golf-specific data model (months 2-5)',
    'Develop tee-time availability aggregation and booking engine (months 4-8)',
    'Integrate with top 2 tee-sheet systems via API (months 6-10)',
    'Build itinerary management for multi-day golf packages (months 7-11)',
    'Implement payment processing and analytics (months 9-12)',
    'Pilot deployment with 2-3 design partners (months 10-15)',
  ],
};

/* ════════════════════════════════════════════════════════
   GO-TO-MARKET
   ════════════════════════════════════════════════════════ */
export const GTM = {
  rating: 'moderate' as const,
  confidence: 70,
  estimatedCAC: '$15,000-$25,000 per resort customer (early stage); decreasing to $10K-$15K as product matures',
  primaryChannel: 'Direct outreach to 200-300 identified destination resorts in North America. Highest pain, clearest ROI, decision-makers accessible via LinkedIn. Target 20-30 qualified meetings in first 90 days.',
  firstMilestone: 'Sign 3 design partner resorts within 6 months at $15K-$20K/yr (discounted) in exchange for deep collaboration and case studies.',
  channels: [
    'Direct outreach to resort GMs and Directors of Golf via LinkedIn and personalized email',
    'Golf industry trade shows (PGA Show, NGCOA Golf Business Conference)',
    'Partnerships with golf resort associations (NGCOA, IAGA)',
    'Case studies and ROI calculators distributed through golf industry publications',
    'Strategic partnerships with tee-sheet vendors as complementary CRM layer',
    'Content marketing targeting \'golf resort technology\' search terms',
  ],
};

/* ════════════════════════════════════════════════════════
   FOUNDER FIT
   ════════════════════════════════════════════════════════ */
export const FOUNDER_FIT = {
  percentage: 65,
  criticalSkillNeeded: 'Enterprise B2B sales and business development in hospitality or golf industry. The ability to identify, reach, and close resort general managers is the critical path to customer acquisition.',
  recommendedFirstHire: 'Technical co-founder or CTO with enterprise SaaS and integration experience. Ideal candidate has built booking/reservation systems, worked with hospitality APIs, and can architect scalable multi-tenant platforms.',
  strengths: [
    'Deep domain expertise in golf industry and understanding of resort operations',
    'Clear identification of specific market gap based on thorough competitive analysis',
    'Understanding of target customer pain points ($100M wasted, $50K+ in fragmented systems)',
    'Recognition of market dynamics including consolidation trends and cloud migration',
  ],
  gaps: [
    'No evidence of technical capability to build complex enterprise SaaS with multiple integrations',
    'Lack of demonstrated B2B enterprise sales experience for 3-6 month sales cycles',
    'No track record of raising capital (likely need $1-2M seed round)',
    'Missing product management experience for feature prioritization and design partner management',
    'No existing relationships with golf resort decision-makers or industry associations',
  ],
};

/* ════════════════════════════════════════════════════════
   VALUE LADDER
   ════════════════════════════════════════════════════════ */
export const VALUE_LADDER = [
  {
    tier: 'lead_magnet',
    label: 'LEAD MAGNET',
    price: 'Free',
    title: 'Golf Resort Booking Cost & Savings Calculator',
    description: 'Estimate labor + system waste and ROI from unified golf booking CRM',
  },
  {
    tier: 'frontend',
    label: 'FRONTEND',
    price: '$499/mo',
    title: 'Tee-Time & Inquiry Pipeline Starter',
    description: 'Centralize leads, calls, and tee-time requests with basic automations',
  },
  {
    tier: 'core',
    label: 'CORE',
    price: '$2,999/mo',
    title: 'Golf CRM + Tee Sheet + Package Booking Suite',
    description: 'Unified CRM, tee sheet, multi-day packages, payments, reporting, rules',
    highlighted: true,
  },
  {
    tier: 'backend',
    label: 'BACKEND',
    price: '$60K+/yr',
    title: 'Multi-Property Enterprise + Managed Implementation',
    description: 'White-glove rollout, custom workflows, integrations, SLAs, data migration',
  },
];

/* ════════════════════════════════════════════════════════
   USER STORY
   ════════════════════════════════════════════════════════ */
export const USER_STORY = {
  protagonist: {
    name: 'Rachel Nguyen',
    title: 'Director of Golf Sales',
    setting: 'Three-course destination resort in the South Carolina Lowcountry',
    experience: '11 years in golf hospitality, manages 4 booking coordinators, personally responsible for $2.8M in annual package revenue',
  },
  quote:
    '"We were paying almost $80,000 a year between Salesforce, our tee-sheet vendor, and the custom integration holding it all together — and we still had a coordinator spending half her week in a spreadsheet. Last month we processed 340 group booking modifications without a single pricing error. My team doesn\'t dread the phone ringing anymore."',
  scenario:
    'It\'s early March at Palmetto Dunes Golf Resort on Hilton Head Island. Peak spring golf season is about to explode. The sales office is fielding 40+ calls a day from groups planning buddy trips, corporate retreats, and reunion weekends — each wanting to play multiple courses over three to five days with different player counts, tee times, lodging, and cart configurations.',
  problem:
    'Rachel\'s operation runs on a painful patchwork: Salesforce ($48K/year plus $30K custom integration), a third-party tee-sheet, separate POS at each pro shop, and a shared Excel workbook called \'The Monster.\' A 16-player corporate group wanting to swap courses means updating four systems and re-emailing a revised itinerary by hand. Last October, a mis-keyed rate caused a $4,200 billing discrepancy that nearly lost the account entirely.',
  solution:
    'With Golf CRM, when the same 16-player corporate group calls to swap courses and tee times, her coordinator drags the block on a unified visual tee sheet. The system recalculates rates, updates the invoice, and fires off a branded itinerary — all in under two minutes without touching a spreadsheet.',
  dayInTheLife: {
    before:
      'Arrives 6:45 AM to find three voicemails. Opens Salesforce, switches to the tee-sheet system (loading slowly from tournament data), cross-references The Monster spreadsheet, calls the pro shop at the second course, then spends 40 minutes building a revised itinerary in Word. By 9:30 AM she\'s handled one modification with eleven more waiting.',
    after:
      'Arrives 7:00 AM. Opens Golf CRM dashboard — overnight request already flagged with full itinerary, roster, and rate history. Coordinator drags the group block, system auto-checks both courses, applies the pre-negotiated rate, generates branded PDF. Done at 7:18 AM. By 9:00 AM, eight modifications processed.',
    timeSaved: '~15 hours/week in booking modifications, plus 12+ staff-hours/month eliminated from reconciliation — $54,000/year in reduced software costs',
  },
  outcome:
    'Average booking-modification time drops from 25 minutes to under 3 minutes. Monthly reconciliation goes from two staff-days to 45 minutes. Software spend cut by $54,000 annually. Rebooking rates climb 22% because frictionless experience makes coordinators look polished instead of scrambling.',
  emotionalArc: {
    frustration:
      'Rachel felt trapped and embarrassed — running a premium resort experience with duct-taped technology. The $4,200 billing error kept her up at night, not because of the money, but because it made her team look incompetent.',
    discovery:
      'At the PGA Show, a fellow resort director mentioned she\'d stopped using Salesforce entirely. Within ten minutes of seeing a 20-player package get built, modified, and invoiced without leaving a single screen, Rachel said: "This is the first time I\'ve seen software that actually understands what we do."',
    relief:
      'Six weeks in, Rachel realized she hadn\'t opened The Monster spreadsheet in over two weeks — and nobody noticed because nothing was falling through the cracks. Her coordinators started volunteering to handle the complex bookings they used to avoid.',
  },
};

/* ════════════════════════════════════════════════════════
   TECH STACK
   ════════════════════════════════════════════════════════ */
export const TECH_STACK = {
  summary: 'This stack prioritizes correctness and operability for complex bookings and tee-time management: Postgres transactions for integrity, Redis + jobs for holds and automation, and a Next.js operator UI with scheduling-grade components.',
  businessType: 'SaaS' as const,
  estimatedMonthlyCost: { min: 20, max: 250 },
  scalabilityNotes: 'The architecture scales cleanly by separating web/API from worker processes and using Postgres as system of record. Tee-time locking uses transactional constraints plus Redis-based short holds to prevent double booking.',
  layers: {
    frontend: [
      { name: 'Next.js (React) + TypeScript', purpose: 'Primary web app for operators', category: 'Framework', cost: '$0' },
      { name: 'Tailwind CSS + shadcn/ui', purpose: 'Consistent, accessible admin-style UI', category: 'UI System', cost: '$0' },
      { name: 'TanStack Table + TanStack Query', purpose: 'High-performance CRM grids and caching', category: 'Data UX', cost: '$0' },
      { name: 'FullCalendar', purpose: 'Tee-sheet scheduling UI with drag/drop', category: 'Scheduling UI', cost: '$0-35' },
    ],
    backend: [
      { name: 'NestJS (Node.js) + TypeScript', purpose: 'Structured backend for domain logic', category: 'Application', cost: '$0' },
      { name: 'REST + OpenAPI', purpose: 'Predictable integration surface for external systems', category: 'API Layer', cost: '$0' },
      { name: 'BullMQ (Redis-backed jobs)', purpose: 'Async workflows: emails, reminders, PDF generation, webhooks', category: 'Background Processing', cost: '$0-20' },
      { name: 'WebSockets (Socket.IO)', purpose: 'Real-time tee-time locks/updates for concurrent staff', category: 'Real-time', cost: '$0-50' },
    ],
    database: [
      { name: 'PostgreSQL', purpose: 'Relational core for CRM entities, bookings, tee times, payments', category: 'Primary Database', cost: '$0-50' },
      { name: 'Prisma ORM', purpose: 'Type-safe schema + migrations for rapid iteration', category: 'Data Access', cost: '$0' },
      { name: 'Redis', purpose: 'Tee-time hold/lock keys, session caching, rate limiting, job queues', category: 'Cache/Locks', cost: '$0-20' },
      { name: 'Object Storage (S3-compatible)', purpose: 'Itineraries, invoices, PDFs, waiver files', category: 'File Storage', cost: '$0-10' },
    ],
    hosting: [
      { name: 'Fly.io / Render', purpose: 'API + worker processes with predictable scaling', category: 'App Hosting', cost: '$10-80' },
      { name: 'Vercel', purpose: 'Best-in-class Next.js hosting and CDN', category: 'Frontend', cost: '$0-20' },
      { name: 'Managed Postgres (Supabase/Neon)', purpose: 'Production-grade Postgres with backups', category: 'Database', cost: '$0-50' },
    ],
    thirdParty: [
      { name: 'Stripe', purpose: 'Deposits, payments, invoices, SaaS subscriptions', category: 'Payments', cost: '2.9% + $0.30/txn' },
      { name: 'Resend / SendGrid', purpose: 'Automated emails: confirmations, itineraries, reminders', category: 'Email', cost: '$0-20' },
      { name: 'Twilio', purpose: 'SMS reminders for payments, tee-time changes, alerts', category: 'SMS/Voice', cost: '$0-50' },
      { name: 'Auth0 / Clerk', purpose: 'Secure login, SSO, MFA, org-based access control', category: 'Auth', cost: '$0-50' },
      { name: 'Sentry', purpose: 'Error tracking and performance traces for booking/payment flows', category: 'Monitoring', cost: '$0-26' },
      { name: 'PostHog', purpose: 'Track funnel from inquiry to deposit to payment', category: 'Analytics', cost: '$0-50' },
      { name: 'PDF Generation (Playwright/PDFKit)', purpose: 'Branded itineraries, invoices, confirmations as PDFs', category: 'Documents', cost: '$0-30' },
    ],
  },
  securityConsiderations: [
    'Strict multi-tenancy isolation (tenant_id on all rows, scoped queries, RLS)',
    'RBAC/permissions: roles for reservations, finance, ops, and property-level access',
    'Idempotency keys and verified webhooks for Stripe — never trust client payment state',
    'Rate limiting and bot protection for public-facing forms',
    'Encrypted secrets in managed secret store; rotate keys; enforce least-privilege IAM',
    'PII handling: minimize stored data, set retention policies, provide data export/delete',
  ],
};

/* ════════════════════════════════════════════════════════
   KEYWORDS
   ════════════════════════════════════════════════════════ */
export const KEYWORDS = {
  primary: ['golf CRM', 'golf course management software', 'golf resort software', 'tee time booking system', 'golf club management', 'golf booking engine'],
  secondary: ['cloud-based golf software', 'golf POS system', 'golf membership management', 'destination golf software', 'golf itinerary management', 'golf vacation booking', 'golf resort CRM', 'tee sheet software', 'golf operations software', 'golf hospitality platform'],
  longTail: [
    'integrated golf resort management software',
    'CRM for golf vacation destinations',
    'all-in-one golf course booking system',
    'golf resort tee time and lodging software',
    'cloud-based golf club CRM',
    'golf course customer relationship management',
    'complex golf booking management system',
    'golf resort itinerary and payment platform',
    'unified golf operations and CRM software',
    'golf destination booking and marketing platform',
    'golf course group booking management',
    'premium golf facility management software',
    'golf resort guest experience platform',
    'multi-course golf booking system',
    'golf vacation package management software',
  ],
};

export const KEYWORD_TRENDS = [
  { keyword: 'golf CRM', volume: 1384, growth: 500 },
  { keyword: 'golf club management', volume: 9421, growth: 499 },
  { keyword: 'golf membership management', volume: 1329, growth: 500 },
];

/* ════════════════════════════════════════════════════════
   ACTION PROMPTS
   ════════════════════════════════════════════════════════ */
export const ACTION_PROMPTS = [
  { id: 'landing-page', title: 'Landing Page Copy', category: 'marketing', description: 'Generate high-converting landing page content tailored to golf vacation resorts and destination courses.' },
  { id: 'outbound-sequence', title: 'Outbound Sales Sequence', category: 'sales', description: 'Create a complete multi-touch outbound sequence to book demos with resort/destination golf decision-makers.' },
  { id: 'pricing-packaging', title: 'Pricing + Packaging Strategy', category: 'strategy', description: 'Design a mid-market-friendly pricing model that maps to golf-ops complexity.' },
  { id: 'mvp-spec', title: 'MVP Product Spec + Data Model', category: 'product', description: 'Turn the idea into an implementable MVP plan with workflows, entities, and acceptance criteria.' },
  { id: 'content-pillar', title: 'Content Engine: Spreadsheet-to-System Playbook', category: 'content', description: 'Create a content plan and cornerstone assets that speak directly to golf resort ops pain.' },
];
