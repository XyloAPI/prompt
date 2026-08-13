const fs = require('fs');
const path = require('path');

const shimPath = path.join(__dirname, '../.open-next/assets/_worker.js');
const content = 'export { default } from "../worker.js";\nexport * from "../worker.js";\n';

fs.writeFileSync(shimPath, content);
console.log('Written _worker.js shim');
