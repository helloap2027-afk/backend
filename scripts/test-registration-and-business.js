const mysql = require('mysql2/promise');

async function testFlow() {
  console.log('--- 1. Testing Registration via API ---');
  // 1. Send OTP
  const sendRes = await fetch('http://localhost:4000/api/v1/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+919876543210' })
  });
  const sendData = await sendRes.json();
  console.log('Send OTP Response:', sendData);

  const challengeId = sendData.data.challengeId;
  const devOtp = sendData.data.devOtp;

  // 2. Verify OTP
  const verifyRes = await fetch('http://localhost:4000/api/v1/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, otp: devOtp })
  });
  const verifyData = await verifyRes.json();
  console.log('Verify OTP Response:', verifyData);

  // 3. Add Free Business
  console.log('\n--- 2. Testing Add Free Business via API ---');
  const bizRes = await fetch('http://localhost:4000/api/v1/businesses/free-listing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Krishna Sweets & Bakery',
      category: 'restaurants',
      city: 'hyderabad',
      locality: 'Kukatpally',
      phone: '+91 98765 43210',
      pincode: '500072'
    })
  });
  const bizData = await bizRes.json();
  console.log('Create Business Response:', bizData);

  // 4. Check directly in MySQL hello_db
  console.log('\n--- 3. Verifying Direct SQL in MySQL hello_db ---');
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database: 'hello_db'
  });

  const [users] = await conn.execute("SELECT id, phone_number, full_name, status, created_at FROM users WHERE phone_number = '+919876543210'");
  console.log('User in MySQL hello_db.users:', users);

  const [biz] = await conn.execute("SELECT id, name, slug, status, created_at FROM businesses WHERE name LIKE '%Krishna Sweets%'");
  console.log('Business in MySQL hello_db.businesses:', biz);

  await conn.end();
}

testFlow().catch(console.error);
