const fs = require('fs');
const path = 'g:\\AFYA LINKS\\apps\\web\\src\\app\\admin\\orders\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace order.clinic_phone with order.customer_phone
content = content.replace(/order\.clinic_phone/g, 'order.customer_phone');

// Replace order.total_amount with order.amount
content = content.replace(/order\.total_amount/g, 'order.amount');

// Replace order.status === 'PENDING' with order.status === 'RECEIVED'
content = content.replace(/order\.status === 'PENDING'/g, "order.status === 'RECEIVED'");

fs.writeFileSync(path, content);
