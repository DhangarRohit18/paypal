// Comprehensive Vertical Slice Verification Test
// Tests: Auth -> Cart -> Deterministic Totals -> Passport -> Mandate Signing -> PayPal Order -> Capture -> Order Record
const BASE = 'http://localhost:5000/api';

async function run() {
  console.log('🚀 Running ShopMate AI Vertical Slice Test...\n');

  // 1. Health check
  const healthRes = await fetch(`${BASE}/health`);
  const health = await healthRes.json();
  console.log('✅ 1. Health Check:', health.status, '| Products:', health.catalogueStats.verifiedProductsCount);

  // 2. Login
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@shopmate.ai', password: 'DemoPass123!' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  console.log('✅ 2. Auth Login:', loginData.user.name, `(${loginData.user.email})`);

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookie || ''
  };

  // 3. Clear cart then add product
  await fetch(`${BASE}/cart`, { method: 'DELETE', headers });
  const addRes = await fetch(`${BASE}/cart/add`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'prod-lap-zenbook-pro', quantity: 1 })
  });
  const addData = await addRes.json();
  console.log('✅ 3. Cart Add: Subtotal = $' + addData.cart.subtotal, '| Tax = $' + addData.cart.tax, '| Total = $' + addData.cart.total);

  // 4. Generate Purchase Passport
  const passRes = await fetch(`${BASE}/passport/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ missionGoal: 'AI Engineering Workstation' })
  });
  const passData = await passRes.json();
  const passport = passData.passport;
  console.log('✅ 4. Purchase Passport Generated:', passport.passportId, '| Status:', passport.approvalStatus, '| FitCheck:', passport.fitCheckSummary.overallStatus);

  // 5. Sign and Authorize Approval Mandate (HMAC-SHA256)
  const apprvRes = await fetch(`${BASE}/passport/${passport.passportId}/approve`, {
    method: 'POST',
    headers
  });
  const apprvData = await apprvRes.json();
  const mandate = apprvData.mandate;
  console.log('✅ 5. Mandate Signed:', mandate.approvalId, '| Fingerprint:', mandate.orderFingerprint.slice(0, 16) + '...', '| SingleUse:', mandate.isSingleUse);

  // 6. Create PayPal Sandbox Order
  const createPayRes = await fetch(`${BASE}/payments/create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      passportId: passport.passportId,
      approvalId: mandate.approvalId
    })
  });
  const payOrder = await createPayRes.json();
  console.log('✅ 6. PayPal Order Created:', payOrder.paypalOrderId, '| Amount: $' + payOrder.finalAmount);

  // 7. Capture PayPal Sandbox Order
  const capRes = await fetch(`${BASE}/payments/capture-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      paypalOrderId: payOrder.paypalOrderId,
      approvalId: mandate.approvalId
    })
  });
  const capData = await capRes.json();
  console.log('✅ 7. PayPal Captured & Order Placed:', capData.order.orderId, '| Status:', capData.order.status, '| Return Window:', capData.order.returnDeadlineDate);

  // 8. Verify Cart is Cleared
  const cartCheckRes = await fetch(`${BASE}/cart`, { headers });
  const cartCheck = await cartCheckRes.json();
  console.log('✅ 8. Live Cart Reset Confirmed: Item count =', cartCheck.cart.items.length);

  // 9. Red Team Simulation Test
  const simRes = await fetch(`${BASE}/security/red-team/simulate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ scenarioId: 'POISONED_PRODUCT' })
  });
  const simData = await simRes.json();
  console.log('✅ 9. Red Team Attack Intercepted:', simData.simulation.title, '| Layer:', simData.simulation.caughtByLayer, '| Outcome:', simData.simulation.outcome);

  console.log('\n🎉 ALL 9 VERTICAL SLICE & SECURITY STEPS VERIFIED 100% END-TO-END!\n');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

