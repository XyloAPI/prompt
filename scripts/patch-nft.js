const fs = require('fs');
const path = require('path');

// 1. Copy the full @libsql directory to standalone node_modules
const srcDir = path.join(__dirname, '../node_modules/@libsql');
const destDir = path.join(__dirname, '../.next/standalone/node_modules/@libsql');
if (fs.existsSync(srcDir)) {
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });
  console.log('Copied @libsql to standalone node_modules.');
}

// 2. Recursively find and patch all .nft.json files
function walkDir(dir, callback) {
  try {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
      const dirPath = path.join(dir, f);
      try {
        const stat = fs.lstatSync(dirPath);
        if (stat.isDirectory()) {
          walkDir(dirPath, callback);
        } else if (stat.isFile()) {
          callback(dirPath);
        }
      } catch (e) {
        // Skip errors on individual files/folders (e.g. broken symlinks)
      }
    });
  } catch (e) {
    // Skip read/access errors on directory
  }
}

const nextDir = path.join(__dirname, '../.next');
if (fs.existsSync(nextDir)) {
  walkDir(nextDir, (filePath) => {
    if (filePath.endsWith('.nft.json')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        if (data && Array.isArray(data.files)) {
          let hasIsomorphicWs = false;
          let wsBasePrefix = '';
          
          data.files.forEach(file => {
            if (file.includes('node_modules/@libsql/isomorphic-ws')) {
              hasIsomorphicWs = true;
              const idx = file.indexOf('node_modules');
              wsBasePrefix = file.substring(0, idx);
            }
          });
          
          if (hasIsomorphicWs) {
            const mjsFile = `${wsBasePrefix}node_modules/@libsql/isomorphic-ws/web.mjs`;
            const cjsFile = `${wsBasePrefix}node_modules/@libsql/isomorphic-ws/web.cjs`;
            
            let updated = false;
            if (!data.files.includes(mjsFile)) {
              data.files.push(mjsFile);
              updated = true;
            }
            if (!data.files.includes(cjsFile)) {
              data.files.push(cjsFile);
              updated = true;
            }
            
            if (updated) {
              fs.writeFileSync(filePath, JSON.stringify(data));
              console.log(`Patched ${path.basename(filePath)}`);
            }
          }
        }
      } catch (err) {
        // Skip invalid JSON or read errors
      }
    }
  });
}
