const fs = require('fs');
let content = fs.readFileSync('src/components/Explore.tsx', 'utf8');
content = content.replace(
  /onClick=\{\(\) \=\> onSelectAdventure\(\{\s*\.\.\.adv\,\s*date\: selectedDate\s*\}\)\}\s*className\=\"mt-auto w-full bg-slate-900 text-white rounded-xl py-3\.5 font-bold hover\:bg-slate-800 transition-colors\"\s*\>\s*Reserva tu cupo\s*\<\/button\>/,
  `onClick={() => onSelectAdventure({ ...adv, date: selectedDate })} disabled={!hasDateSelected} className={\`mt-auto w-full rounded-xl py-3.5 font-bold transition-colors \${ hasDateSelected ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400 cursor-not-allowed" }\`}> {hasDateSelected ? "Reserva tu cupo" : "Elige una fecha primero"} </button>`
);
fs.writeFileSync('src/components/Explore.tsx', content);
