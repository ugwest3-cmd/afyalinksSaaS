const fs = require('fs');
const path = 'g:\\AFYA LINKS\\apps\\web\\src\\app\\admin\\orders\\[id]\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace order.clinic_phone with order.customer_phone
content = content.replace(/order\.clinic_phone/g, 'order.customer_phone');

// Replace order.total_amount with order.amount
content = content.replace(/order\.total_amount/g, 'order.amount');

fs.writeFileSync(path, content);
