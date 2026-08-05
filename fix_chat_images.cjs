const fs = require('fs');
let chat = fs.readFileSync('src/components/Chat.tsx', 'utf8');
chat = chat.replace(/<img (.*?) \/>/g, (match, p1) => {
    if (!p1.includes('referrerPolicy')) {
        return `<img ${p1} referrerPolicy="no-referrer" />`;
    }
    return match;
});
fs.writeFileSync('src/components/Chat.tsx', chat);
