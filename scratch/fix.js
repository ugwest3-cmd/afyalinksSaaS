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

  // Fix logger.error('msg', err) -> logger.error(err, 'msg')
  const newContent = content.replace(/logger\.error\((['`].*?['`]),\s*([^)]+)\)/g, (match, p1, p2) => {
    return `logger.error(${p2}, ${p1})`;
  });
  if (content !== newContent) {
    content = newContent;
    changed = true;
  }

  // Fix import logger from '../config/logger' -> import { logger } from '../config/logger'
  if (content.includes('import logger from')) {
    content = content.replace(/import logger from/g, 'import { logger } from');
    changed = true;
  }

  // Fix missing API_URL in env (actually we should add NEXT_PUBLIC_API_URL or BACKEND_URL)
  if (file.includes('payment.service.ts') && content.includes('env.API_URL')) {
    content = content.replace(/env\.API_URL/g, 'env.BACKEND_URL');
    changed = true;
  }
  
  // Fix auditService import in pricing/payment
  if (content.includes('import { auditService }')) {
    content = content.replace(/import \{ auditService \}/g, 'import { AuditService }');
    content = content.replace(/auditService\./g, 'AuditService.');
    changed = true;
  }
  
  // Fix encryptionService import in payment
  if (content.includes('import { encryptionService }')) {
    content = content.replace(/import \{ encryptionService \}/g, 'import { EncryptionService }');
    content = content.replace(/encryptionService\./g, 'EncryptionService.');
    changed = true;
  }

  // Fix makeWASocket default import
  if (file.includes('session.ts') && content.includes('makeWASocket.default')) {
    content = content.replace(/makeWASocket\.default/g, 'makeWASocket');
    changed = true;
  }

  // Fix session.ts potentially null objects
  if (file.includes('session.ts') && content.includes('this.socket.')) {
    content = content.replace(/this\.socket\./g, 'this.socket?.');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}
