const fs = require('fs');
const files = [
  'g:\\AFYA LINKS\\apps\\server\\src\\services\\whatsapp\\session.ts',
  'g:\\AFYA LINKS\\apps\\server\\src\\services\\whatsapp\\store.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/from ['"]@\/config\/logger\.js['"];/g, "from '../../config/logger.js';");
  fs.writeFileSync(file, content);
}
