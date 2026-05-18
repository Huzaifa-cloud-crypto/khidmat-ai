const cases = [
  { id:'TC-01', label:'Pure Urdu + pipe burst severity', text:'mere ghar ka paani band ho gaya hai, pipe phoot gayi hai, G-9 mein hoon, abhi foran koi plumber bhejo' },
  { id:'TC-02', label:'Roman Urdu budget negotiation', text:'bhai electrical ka kaam hai, zyada paise nahi hain, koi sasta aur acha banda milega F-10 mein kal?' },
  { id:'TC-03', label:'English + Urdu location slang', text:'need AC servicing done, not urgent, somewhere in pindi DHA phase 2, next week anytime' },
  { id:'TC-04', label:'Code-switch + misspelling + vague time', text:'mujy apni washing masheen theek karwani hai, apperantly motor kharab ho gai, I-8 sector, shayad kal ya parso' },
  { id:'TC-05', label:'No location given', text:'bijli ka masla hai andar wiring mein, koi electrician chahiye jaldi' },
  { id:'TC-06', label:'Multiple services in one request', text:'ek painter aur ek carpenter dono chahiye, G-7 mein renovation chal rahi hai, budget tight hai' },
  { id:'TC-07', label:'High complexity + certification demand', text:'3-phase commercial AC unit install karni hai, certified technician chahiye with experience, E-11 mein, kal morning' },
  { id:'TC-08', label:'Extreme urgency + price insensitive', text:'water heater leaked and flooded bathroom, emergency plumber needed RIGHT NOW in F-8, cost does not matter' },
];

async function runAll() {
  for (const c of cases) {
    process.stdout.write('Testing ' + c.id + ' (' + c.label + ')...\n');
    try {
      const res = await fetch('http://localhost:3000/api/service/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: c.text, requestId: c.id })
      });
      const d = await res.json();
      const conf = d.intent?.confidence_score;
      const svc = d.intent?.service_category;
      const loc = d.intent?.location_sector;
      const complexity = d.intent?.complexity;
      const urgency = d.intent?.urgency;
      const budget = d.intent?.budget_sensitivity;
      const provider = d.provider?.name;
      const score = d.provider?.matchScore;
      const price = d.pricing?.finalEstimatedPrice;
      const surge = d.pricing?.surgeLabel;
      const loyalty = d.pricing?.loyaltyDiscountPercent;
      const alt = d.pricing?.budgetAlternative?.estimatedPrice;

      if (d.status === 'CLARIFICATION_NEEDED') {
        console.log('  STATUS: CLARIFICATION_NEEDED');
        console.log('  QUESTION:', d.message);
      } else {
        console.log('  STATUS:', d.status);
        console.log('  PARSED: svc=' + svc + ' | loc=' + loc + ' | complexity=' + complexity + ' | urgency=' + urgency + ' | budget=' + budget + ' | confidence=' + conf);
        if (provider) {
          console.log('  PROVIDER:', provider, '| matchScore=' + score + ' | price=Rs.' + price + (alt ? ' (alt: Rs.' + alt + ')' : ''));
          console.log('  PRICING:', surge + (loyalty ? ' | loyalty -' + loyalty + '%' : ''));
          console.log('  SCHEDULED:', d.booking?.scheduledTime);
        }
      }
      console.log('');
    } catch(e) {
      console.log('  ERROR:', e.message, '\n');
    }
  }
}

runAll();
