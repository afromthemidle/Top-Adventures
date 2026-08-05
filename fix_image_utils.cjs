const fs = require('fs');
let content = fs.readFileSync('src/utils/imageUtils.ts', 'utf8');

content = content.replace(
  /if \(imageUrl && imageUrl\.trim\(\) !== ''\) return imageUrl;/,
  "// Ignore imageUrl to force local images\n  // if (imageUrl && imageUrl.trim() !== '') return imageUrl;"
);

fs.writeFileSync('src/utils/imageUtils.ts', content);
