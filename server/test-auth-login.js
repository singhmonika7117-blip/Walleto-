const http = require('http');
const express = require('express');
const cors = require('cors');
const assert = require('assert');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');

console.log('🧪 Starting Authentication & Login Debug Verification Suite...\n');

async function runAuthTests() {
  await connectDB();

  const app = express();
  app.use(express.json());

  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000'
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, true);
      },
      credentials: true
    })
  );

  app.use('/api/auth', authRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/auth`;
  console.log(`📡 Auth Test Server running on port ${port}`);

  // Test 1: Successful Login with valid credentials
  console.log('\n--- Test 1: Successful Login with valid credentials ---');
  const validRes = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173'
    },
    body: JSON.stringify({
      email: 'alex@example.com',
      password: 'password123'
    })
  });

  const validData = await validRes.json();
  assert.strictEqual(validRes.status, 200, `Expected 200, got ${validRes.status}`);
  assert.strictEqual(validData.success, true);
  assert.ok(validData.token, 'Should return a valid JWT token');
  assert.strictEqual(validData.user.email, 'alex@example.com');
  console.log('✅ Test 1 Passed: Valid credentials logged in successfully with token & user profile');

  // Test 2: Invalid Password rejection
  console.log('\n--- Test 2: Invalid Password rejection ---');
  const invalidPassRes = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alex@example.com',
      password: 'wrong_password_999'
    })
  });

  const invalidPassData = await invalidPassRes.json();
  assert.strictEqual(invalidPassRes.status, 401);
  assert.strictEqual(invalidPassData.success, false);
  assert.strictEqual(invalidPassData.message, 'Invalid email or password');
  console.log('✅ Test 2 Passed: Wrong password rejected with 401 & "Invalid email or password"');

  // Test 3: Non-existent Email rejection
  console.log('\n--- Test 3: Non-existent Email rejection ---');
  const noUserRes = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nonexistent_user_999@example.com',
      password: 'password123'
    })
  });

  const noUserData = await noUserRes.json();
  assert.strictEqual(noUserRes.status, 401);
  assert.strictEqual(noUserData.success, false);
  assert.strictEqual(noUserData.message, 'Invalid email or password');
  console.log('✅ Test 3 Passed: Non-existent user rejected with 401 & "Invalid email or password"');

  // Test 4: Missing Fields validation
  console.log('\n--- Test 4: Missing Fields validation ---');
  const missingRes = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@example.com' })
  });

  const missingData = await missingRes.json();
  assert.strictEqual(missingRes.status, 400);
  assert.strictEqual(missingData.message, 'Please provide email and password');
  console.log('✅ Test 4 Passed: Missing password rejected with 400 & clear validation message');

  // Test 5: CORS Headers verification for http://localhost:5173
  console.log('\n--- Test 5: CORS Preflight and Header check ---');
  const corsPreflight = await fetch(`${baseUrl}/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
  });

  assert.strictEqual(
    corsPreflight.headers.get('access-control-allow-origin'),
    'http://localhost:5173',
    'CORS header Access-Control-Allow-Origin must match request origin'
  );
  assert.strictEqual(
    corsPreflight.headers.get('access-control-allow-credentials'),
    'true',
    'CORS header Access-Control-Allow-Credentials must be true'
  );
  console.log('✅ Test 5 Passed: CORS Preflight and credentials verified successfully');

  server.close(() => {
    console.log('\n🎉 ALL AUTHENTICATION & LOGIN TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  });
}

runAuthTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
