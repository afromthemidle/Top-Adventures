const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "participants: mockParticipants[data.activityId] || [],",
  "participants: [],"
);

content = content.replace(
  "profile={profile || { name: '', city: 'Cuenca', interests: [] }}",
  "existingProfile={profile}"
);

fs.writeFileSync('src/App.tsx', content);
