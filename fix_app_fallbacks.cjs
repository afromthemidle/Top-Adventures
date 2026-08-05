const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "meetingPoint: {",
  "meetingPoint: {"
).replace(
  "name: template.meetingPointName,",
  "name: template.meetingPointName || 'Punto de encuentro',"
).replace(
  "address: template.meetingPointAddress,",
  "address: template.meetingPointAddress || '',"
).replace(
  "requiredGear: template.requiredGear,",
  "requiredGear: template.requiredGear || [],"
).replace(
  "time: template.time,",
  "time: template.time || '12:00',"
).replace(
  "sport: template.sport,",
  "sport: template.sport || 'Aventura',"
);

fs.writeFileSync('src/App.tsx', content);
