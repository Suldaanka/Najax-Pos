const axios = require('axios');

async function testStatus() {
  try {
    const res = await axios.get('https://najax-pos-production.up.railway.app/api/subscriptions/status', {
      headers: {
        'Cookie': 'najax.session_token=test_token_not_important'
      }
    });
    console.log(res.status, res.data);
  } catch (error) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testStatus();
