const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const replacement = `<img src={bannerImage} alt={adventure.sport} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; }} />`;

content = content.replace(/<img src=\{bannerImage\}.*?\/>/g, replacement);

fs.writeFileSync('src/components/Dashboard.tsx', content);
