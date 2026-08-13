const fs = require('fs');
const path = require('path');

// 1. Write _worker.js shim
const shimPath = path.join(__dirname, '../.open-next/assets/_worker.js');
const content = 'export { default } from "../worker.js";\nexport * from "../worker.js";\n';
fs.writeFileSync(shimPath, content);
console.log('Written _worker.js shim');

// 2. Write _routes.json to let Cloudflare Pages serve static assets directly
const routesPath = path.join(__dirname, '../.open-next/assets/_routes.json');
const routesContent = {
  "version": 1,
  "include": [
    "/*"
  ],
  "exclude": [
    "/_next/static/*",
    "/uploads/*",
    "/*.svg",
    "/*.ico",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.webp",
    "/*.woff",
    "/*.woff2",
    "/*.ttf"
  ]
};
fs.writeFileSync(routesPath, JSON.stringify(routesContent, null, 2));
console.log('Written _routes.json');
