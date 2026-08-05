const fs = require('fs');
let content = fs.readFileSync('src/components/Explore.tsx', 'utf8');
content = content.replace(
  /\>\s*Reserva tu cupo\s*\<\/button\>/,
  `>{hasDateSelected ? "Reserva tu cupo" : "Elige una fecha"}</button>`
);
fs.writeFileSync('src/components/Explore.tsx', content);
