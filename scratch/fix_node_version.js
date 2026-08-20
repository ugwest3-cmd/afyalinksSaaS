const fs = require('fs');
const path = 'g:\\AFYA LINKS\\package.json';
let content = JSON.parse(fs.readFileSync(path, 'utf8'));
content.engines = {
  node: ">=22.0.0"
};
fs.writeFileSync(path, JSON.stringify(content, null, 2));
