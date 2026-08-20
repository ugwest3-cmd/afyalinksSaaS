const fs = require('fs');
const path = 'g:\\AFYA LINKS\\apps\\web\\src\\components\\ui\\button.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add 'icon' to size type
content = content.replace(/size\?: 'sm' \| 'md' \| 'lg';/, "size?: 'sm' | 'md' | 'lg' | 'icon';");

// Add 'icon' to sizes object
content = content.replace(
  /lg: 'h-12 px-8 text-base',/,
  "lg: 'h-12 px-8 text-base',\n      icon: 'h-10 w-10',"
);

fs.writeFileSync(path, content);
