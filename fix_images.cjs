const fs = require('fs');

let dashboard = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
dashboard = dashboard.replace(/<img (.*?) \/>/g, (match, p1) => {
    if (!p1.includes('referrerPolicy')) {
        return `<img ${p1} referrerPolicy="no-referrer" />`;
    }
    return match;
});
fs.writeFileSync('src/components/Dashboard.tsx', dashboard);

let explore = fs.readFileSync('src/components/Explore.tsx', 'utf8');
explore = explore.replace(/<img (.*?) \/>/g, (match, p1) => {
    if (!p1.includes('referrerPolicy')) {
        return `<img ${p1} referrerPolicy="no-referrer" />`;
    }
    return match;
});
fs.writeFileSync('src/components/Explore.tsx', explore);
