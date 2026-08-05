const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(
  "const adv = adventures.find(a => a.activityId === initialAdventureId);",
  "const adv = adventures.find(a => a.id === initialAdventureId) || adventures.find(a => a.activityId === initialAdventureId);"
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
