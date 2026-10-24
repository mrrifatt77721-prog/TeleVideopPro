// Rebuilds the folder structure from flat file names (a__b__c.js -> a/b/c.js).
// Lets you upload every file in ONE folder from a phone, where GitHub cannot upload folders.
import fs from 'fs';
import path from 'path';
let n = 0;
for (const f of fs.readdirSync('.')) {
  if (!f.includes('__') || !fs.statSync(f).isFile()) continue;
  const parts = f.split('__');
  if (parts[parts.length - 1] === 'env.example') parts[parts.length - 1] = '.env.example';
  const dest = parts.join('/');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(f, dest);
  n++;
}
console.log('setup: placed ' + n + ' files into folders');
