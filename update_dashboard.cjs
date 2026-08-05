const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
content = content.replace(
  "import { db } from '../firebase';",
  "import { db, auth } from '../firebase';\nimport { signOut } from 'firebase/auth';"
);
content = content.replace(
  "CalendarPlus } from 'lucide-react';",
  "CalendarPlus, LogOut } from 'lucide-react';"
);
content = content.replace(
  /<h1 className="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">Mis Actividades<\/h1>/,
  `<div className="flex justify-between items-center mb-6">\n          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Mis Actividades</h1>\n          <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">\n            <LogOut className="w-5 h-5" />\n          </button>\n        </div>`
);
fs.writeFileSync('src/components/Dashboard.tsx', content);
