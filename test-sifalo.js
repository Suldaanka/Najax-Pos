const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function runTests() {
  const tests = [
    { account: '0619567778', gateway: 'waafi' },
    { account: '252619567778', gateway: 'waafi' },
    { account: '619567778', gateway: 'waafi' },
    { account: '0619567778', gateway: 'edahab' },
    { account: '659567778', gateway: 'edahab' } // typical edahab format in Somalia
  ];

  const username = process.env.SIFALOPAY_USERNAME;
  const password = process.env.SIFALOPAY_PASSWORD;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  for (const t of tests) {
    const data = {
      account: t.account,
      gateway: t.gateway,
      amount: '1',
      currency: 'USD',
      order_id: 'test-' + Date.now()
    };
    try {
      const res = await axios.post('https://api.sifalopay.com/gateway/', data, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Test ${t.gateway} ${t.account} -> Status:`, res.status, 'Data:', res.data);
    } catch (err) {
      console.log(`Test ${t.gateway} ${t.account} -> Error:`, err.response ? err.response.data : err.message);
    }
  }
}

runTests();
