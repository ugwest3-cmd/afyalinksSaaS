const fs = require('fs');
const path = 'g:\\AFYA LINKS\\apps\\server\\src\\routes\\order.routes.ts';
let content = fs.readFileSync(path, 'utf8');

const newRoute = `
router.patch('/admin/orders/:id/price', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ success: false, error: 'Valid amount is required' });
  }
  const order = await orderService.updateOrderAmount(req.params.id, Number(amount));
  res.json({ success: true, data: order });
}));

// Internal routes (requires auth)
`;

content = content.replace(/\/\/ Internal routes \(requires auth\)/, newRoute);

fs.writeFileSync(path, content);
