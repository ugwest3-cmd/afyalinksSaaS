const fs = require('fs');
const orderPath = 'g:\\AFYA LINKS\\apps\\server\\src\\services\\order.service.ts';
let orderContent = fs.readFileSync(orderPath, 'utf8');

// Match auditService.logAction({ action: 'ORDER_CANCELLED', ... }) if any
orderContent = orderContent.replace(
  /auditService\.logAction\(\{\s*action: '([^']+)',\s*actorId: '([^']+)',\s*entityId: ([^,]+),\s*entityType: '([^']+)',\s*details: (\{[^}]+\})\s*\}\);/g,
  "auditService.logAction('$2', '$1', '$4', $3, $5);"
);
// Match auditService.logAction('something')
orderContent = orderContent.replace(
  /auditService\.logAction\('([^']+)'\);/g,
  "auditService.logAction('SYSTEM', '$1', 'ORDER', 'unknown');"
);

fs.writeFileSync(orderPath, orderContent);
