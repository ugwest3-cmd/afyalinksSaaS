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

  // Revert AuditService / EncryptionService to auditService / encryptionService
  if (content.includes('AuditService')) {
    content = content.replace(/AuditService/g, 'auditService');
    changed = true;
  }
  if (content.includes('EncryptionService')) {
    content = content.replace(/EncryptionService/g, 'encryptionService');
    changed = true;
  }

  // Fix authenticate to requireAuth in whatsapp.routes
  if (file.includes('whatsapp.routes.ts') && content.includes('authenticate')) {
    content = content.replace(/authenticate/g, 'requireAuth');
    changed = true;
  }

  // Add explicit Router type to fix inference error
  if (content.includes('const router = Router();')) {
    content = content.replace(/const router = Router\(\);/g, 'const router: Router = Router();');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
}

// Fix env.ts missing BACKEND_URL
const envPath = 'g:\\AFYA LINKS\\apps\\server\\src\\config\\env.ts';
let envContent = fs.readFileSync(envPath, 'utf8');
if (!envContent.includes('BACKEND_URL:')) {
  envContent = envContent.replace(
    /FRONTEND_URL: process\.env\.FRONTEND_URL \|\| 'http:\/\/localhost:3000',/g,
    "FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',\n  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:4000',"
  );
  fs.writeFileSync(envPath, envContent);
}

// Fix pesapal client.ts 'Type null is not assignable to type string'
const pClientPath = 'g:\\AFYA LINKS\\apps\\server\\src\\services\\pesapal\\client.ts';
let pcContent = fs.readFileSync(pClientPath, 'utf8');
pcContent = pcContent.replace(/return this\.token/g, 'return this.token || ""');
fs.writeFileSync(pClientPath, pcContent);
