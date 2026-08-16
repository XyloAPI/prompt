const fs = require('fs');
const path = require('path');

// 1. Polyfill process.versions.node in the generated worker.js
const workerPath = path.join(__dirname, '../.open-next/worker.js');
if (fs.existsSync(workerPath)) {
  let workerContent = fs.readFileSync(workerPath, 'utf8');
  const polyfill = `
// Polyfill process.versions.node for Cloudflare worker (Sentry compatibility)
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {}, versions: { node: '20.0.0' } };
} else {
  if (typeof globalThis.process.versions === 'undefined') {
    globalThis.process.versions = { node: '20.0.0' };
  } else if (typeof globalThis.process.versions.node === 'undefined') {
    globalThis.process.versions.node = '20.0.0';
  }
}
`;
  workerContent = polyfill + workerContent;
  fs.writeFileSync(workerPath, workerContent);
  console.log('Polyfilled process.versions.node in .open-next/worker.js');
} else {
  console.warn('Could not find .open-next/worker.js to patch!');
}

// 2. Write _worker.js shim
const shimPath = path.join(__dirname, '../.open-next/assets/_worker.js');
const content = 'export { default } from "../worker.js";\nexport * from "../worker.js";\n';
fs.writeFileSync(shimPath, content);
console.log('Written _worker.js shim');

// 3. Write _routes.json to let Cloudflare Pages serve static assets directly
const routesPath = path.join(__dirname, '../.open-next/assets/_routes.json');
const routesContent = {
  "version": 1,
  "include": [
    "/*"
  ],
  "exclude": [
    "/_next/static/*",
    "/uploads/*",
    "/file.svg",
    "/globe.svg",
    "/luminaq.ico",
    "/luminaq.svg",
    "/next.svg",
    "/vercel.svg",
    "/window.svg",
    "/favicon.ico"
  ]
};
fs.writeFileSync(routesPath, JSON.stringify(routesContent, null, 2));
console.log('Written _routes.json');
