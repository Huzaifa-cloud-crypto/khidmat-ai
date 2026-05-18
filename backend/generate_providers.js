const fs = require('fs');
const path = require('path');

const firstNames = ["Ali", "Ahmed", "Usman", "Bilal", "Zain", "Farhan", "Kamran", "Imran", "Tariq", "Hassan", "Saad", "Raza", "Naveed", "Asif", "Shahid", "Waqas", "Aamir", "Salman", "Faisal", "Yasir"];
const lastNames = ["Khan", "Malik", "Chaudhry", "Ahmad", "Shah", "Qureshi", "Ansari", "Mirza", "Sheikh", "Butt"];
const categories = ["ac-repair", "plumbing", "electrical", "carpentry", "painting", "cleaning", "beauty", "tutoring", "mechanic", "pest-control", "appliance-repair", "masonry"];
const sectors = ["F-6", "F-7", "F-8", "F-10", "F-11", "G-6", "G-7", "G-8", "G-9", "G-10", "G-11", "G-13", "G-14", "G-15", "H-8", "H-9", "H-13", "I-8", "I-9", "I-10", "I-11", "E-7", "E-11", "DHA-1", "DHA-2", "PWD", "BAHRIA", "SCHEME-33", "GULZAR-E-HIJRI", "GULISTAN-E-JAUHAR", "GULSHAN-E-IQBAL"];

const generateProviders = (count) => {
    const providers = [];
    for (let i = 1; i <= count; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const sector = sectors[Math.floor(Math.random() * sectors.length)];
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        providers.push({
            id: `P-${i.toString().padStart(4, '0')}`,
            name: `${firstName} ${lastName}`,
            phone: `03${Math.floor(Math.random() * 50) + 10}-${Math.floor(1000000 + Math.random() * 9000000)}`,
            category: category,
            sector: sector,
            rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1),
            reviewsCount: Math.floor(Math.random() * 200) + 10,
            reliabilityScore: Math.floor(Math.random() * 20) + 80,
            cancellationRate: Math.floor(Math.random() * 15),
            baseRate: Math.floor(Math.random() * 1500) + 500,
            capacity: Math.floor(Math.random() * 5) + 2,
            jobsToday: Math.floor(Math.random() * 3),
            photoUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
            latitude: 33.7297 + (Math.random() - 0.5) * 0.1,
            longitude: 73.0748 + (Math.random() - 0.5) * 0.1
        });
    }
    return providers;
};

const providersData = generateProviders(60);

const dirPath = path.join(__dirname, 'src', 'data');
if (!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath, { recursive: true });
}

fs.writeFileSync(path.join(dirPath, 'providers.json'), JSON.stringify(providersData, null, 2));
console.log(`Successfully generated ${providersData.length} mock providers.`);
