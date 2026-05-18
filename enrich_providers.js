/**
 * Script to enrich providers.json with:
 * - specializations (array)
 * - lastReviewDate
 * - riskScore
 * - totalBookings
 * - experienceYears
 */
const fs = require('fs');
const path = require('path');

const providersPath = path.join(__dirname, 'backend/src/data/providers.json');
const providers = JSON.parse(fs.readFileSync(providersPath, 'utf8'));

// Specialization map: primary category + possible secondary specializations
const specializationMap = {
  'ac-repair':       [['ac-repair'], ['ac-repair', 'appliance-repair'], ['ac-repair', 'electrical'], ['ac-repair']],
  'electrical':      [['electrical'], ['electrical', 'appliance-repair'], ['electrical'], ['electrical', 'ac-repair']],
  'plumbing':        [['plumbing'], ['plumbing', 'masonry'], ['plumbing'], ['plumbing', 'cleaning']],
  'tutoring':        [['tutoring'], ['tutoring'], ['tutoring'], ['tutoring']],
  'masonry':         [['masonry'], ['masonry', 'painting'], ['masonry', 'carpentry'], ['masonry']],
  'beauty':          [['beauty'], ['beauty'], ['beauty'], ['beauty']],
  'cleaning':        [['cleaning'], ['cleaning', 'pest-control'], ['cleaning'], ['cleaning']],
  'mechanic':        [['mechanic'], ['mechanic'], ['mechanic'], ['mechanic', 'electrical']],
  'appliance-repair':[['appliance-repair'], ['appliance-repair', 'electrical'], ['appliance-repair', 'ac-repair'], ['appliance-repair']],
  'carpentry':       [['carpentry'], ['carpentry', 'masonry'], ['carpentry', 'painting'], ['carpentry']],
  'painting':        [['painting'], ['painting', 'masonry'], ['painting'], ['painting', 'carpentry']],
  'pest-control':    [['pest-control'], ['pest-control', 'cleaning'], ['pest-control'], ['pest-control']],
};

function getDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const enriched = providers.map((p, i) => {
  const reliability = p.reliabilityScore;
  const cancelRate = p.cancellationRate;
  
  // Risk score: higher cancellationRate + lower reliability = higher risk
  const riskScore = Math.min(100, Math.round(
    (cancelRate * 4) + ((100 - reliability) * 0.6)
  ));

  // Pick a specialization pattern based on index
  const specs = specializationMap[p.category] || [[p.category]];
  const specializations = specs[i % specs.length];

  // lastReviewDate: stagger between 2 and 60 days ago
  const daysAgo = 2 + (i * 97 % 58); // deterministic spread
  const lastReviewDate = getDaysAgo(daysAgo);

  // totalBookings: correlate with reviewsCount
  const totalBookings = p.reviewsCount + Math.floor(Math.random() * 50) + 20;

  // experienceYears: based on totalBookings
  const experienceYears = Math.max(1, Math.floor(totalBookings / 60));

  return {
    ...p,
    specializations,
    lastReviewDate,
    riskScore,
    totalBookings,
    experienceYears,
  };
});

fs.writeFileSync(providersPath, JSON.stringify(enriched, null, 2));
console.log(`✅ Enriched ${enriched.length} providers`);
console.log('Sample:', JSON.stringify(enriched[0], null, 2));
