const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
};

const files = walk('g:\\AFYA LINKS\\apps\\server\\src');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Fix auditService import
  if (content.includes('import { auditService }')) {
    content = content.replace(/import \{ auditService \} from ['"](.*)['"];/g, "import * as auditService from '$1';");
    changed = true;
  }

  // Fix encryptionService import
  if (content.includes('import { encryptionService }')) {
    content = content.replace(/import \{ encryptionService \} from ['"](.*)['"];/g, "import * as encryptionService from '$1';");
    changed = true;
  }

  // Fix pesapal client null token
  if (file.includes('pesapal\\client.ts') && content.includes('return this.token;')) {
    content = content.replace(/return this\.token;/g, 'return this.token || "";');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}
