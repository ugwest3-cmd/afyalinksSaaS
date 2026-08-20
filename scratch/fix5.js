const fs = require('fs');

// Fix pesapal client null token
const pClientPath = 'g:\\AFYA LINKS\\apps\\server\\src\\services\\pesapal\\client.ts';
let pcContent = fs.readFileSync(pClientPath, 'utf8');
pcContent = pcContent.replace(/return this\.accessToken;/g, 'return this.accessToken || "";');
fs.writeFileSync(pClientPath, pcContent);

// Fix order.service.ts
const orderPath = 'g:\\AFYA LINKS\\apps\\server\\src\\services\\order.service.ts';
let orderContent = fs.readFileSync(orderPath, 'utf8');
orderContent = orderContent.replace(
  /auditService\.logAction\(\{\s*action: '([^']+)',\s*actorId: '([^']+)',\s*entityId: ([^,]+),\s*entityType: '([^']+)',\s*details: (\{[^}]+\})\s*\}\);/g,
  "auditService.logAction('$2', '$1', '$4', $3, $5);"
);
fs.writeFileSync(orderPath, orderContent);

// Fix payment.service.ts
const payPath = 'g:\\AFYA LINKS\\apps\\server\\src\\services\\pesapal\\payment.service.ts';
let payContent = fs.readFileSync(payPath, 'utf8');
// match: auditService.logAction('PAYMENT_CREATED', { orderId: order.id, paymentId: payment.id, amount: order.amount }, null);
payContent = payContent.replace(
  /auditService\.logAction\('PAYMENT_CREATED', (\{[^}]+\}), null\);/g,
  "auditService.logAction('SYSTEM', 'PAYMENT_CREATED', 'ORDER', order.id, $1);"
);
// match: await auditService.logAction('PAYMENT_CONFIRMED', { paymentId: payment.id, trackingId: orderTrackingId }, null);
payContent = payContent.replace(
  /auditService\.logAction\('PAYMENT_CONFIRMED', (\{[^}]+\}), null\);/g,
  "auditService.logAction('SYSTEM', 'PAYMENT_CONFIRMED', 'PAYMENT', payment.id, $1);"
);
// match: await auditService.logAction('PAYMENT_FAILED', { paymentId: payment.id, trackingId: orderTrackingId }, null);
payContent = payContent.replace(
  /auditService\.logAction\('PAYMENT_FAILED', (\{[^}]+\}), null\);/g,
  "auditService.logAction('SYSTEM', 'PAYMENT_FAILED', 'PAYMENT', payment.id, $1);"
);
fs.writeFileSync(payPath, payContent);
