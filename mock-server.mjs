import { App } from '@tinyhttp/app';
import { cors } from '@tinyhttp/cors';
import { json } from 'milliparsec';
import { createApp } from './node_modules/json-server/lib/app.js';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_FILE = path.resolve('db.json');
const SEED_FILE = path.resolve('db.seed.example.json');

// 1. Ensure db.json exists, seeded from db.seed.example.json if missing
if (!fs.existsSync(DB_FILE)) {
  console.log('[Mock Server] db.json not found. Initializing from db.seed.example.json...');
  let seedContent = fs.readFileSync(SEED_FILE, 'utf8').replace(/^\uFEFF/, '');
  fs.writeFileSync(DB_FILE, seedContent, 'utf8');
}

// 2. Initialize LowDB and ensure no passwords exist in db.json
const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter, {});
await db.read();
db.data = db.data || {};

let sanitizedAny = false;
if (Array.isArray(db.data.users)) {
  db.data.users.forEach((u) => {
    if ('password' in u) {
      delete u.password;
      sanitizedAny = true;
    }
  });
}
if (sanitizedAny) {
  console.log('[Mock Server] Sanitized plaintext passwords from db.json.');
  await db.write();
}

// 3. In-memory demo credentials store (never leaked via API)
const DEMO_CREDENTIALS = new Map([
  ['admin@eventhub.com', ['admin123', 'demo123']],
  ['host@eventhub.com', ['host123', 'demo123']],
  ['management@eventhub.com', ['manage123', 'demo123']],
  ['staff@eventhub.com', ['staff123', 'demo123']],
  ['jeet@eventhub.com', ['password123', 'demo123']]
]);

// Track runtime-registered passwords in-memory
const REGISTERED_CREDENTIALS = new Map();

// 4. Create base json-server application
const jsonServerApp = createApp(db);

// 5. Create wrapper application
const app = new App();

// CORS configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

app.options('*', cors());
app.use(json());

// 6. Secure Mock Auth Endpoint: POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  // Validate credentials against in-memory demo store or newly registered store
  const demoAllowed = DEMO_CREDENTIALS.get(normalizedEmail) || [];
  const registeredAllowed = REGISTERED_CREDENTIALS.get(normalizedEmail);
  const isValid = demoAllowed.includes(trimmedPassword) || registeredAllowed === trimmedPassword;

  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  // Reload database to get current users
  await db.read();
  const users = Array.isArray(db.data.users) ? db.data.users : [];
  const userRecord = users.find(
    (u) => u.email && u.email.toLowerCase() === normalizedEmail
  );

  if (!userRecord) {
    return res.status(404).json({
      success: false,
      message: 'Account not found in mock database.'
    });
  }

  // Ensure password is never exposed in the response
  const { password: _removed, ...safeUser } = userRecord;

  // Generate simulated mock session token
  const token = `mock-token-${safeUser.id}-${Date.now()}`;

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    token,
    user: safeUser
  });
});

// 7. Secure Mock Auth Endpoint: POST /auth/register
app.post('/auth/register', async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body || {};

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'First name, last name, email, and password are required.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  await db.read();
  db.data.users = db.data.users || [];

  const existing = db.data.users.find(
    (u) => u.email && u.email.toLowerCase() === normalizedEmail
  );
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email address already exists.'
    });
  }

  // Create sanitized user record in database without password
  const newUserId = `user-${String(db.data.users.length + 1).padStart(3, '0')}`;
  const newUser = {
    id: newUserId,
    email: normalizedEmail,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone ? phone.trim() : '',
    avatarUrl: null,
    isEmailVerified: true,
    isPhoneVerified: false,
    isHost: false,
    platformRole: 'user',
    createdAt: new Date().toISOString()
  };

  db.data.users.push(newUser);
  await db.write();

  // Store password strictly in-memory (never persisted in db.json)
  REGISTERED_CREDENTIALS.set(normalizedEmail, password.trim());

  const token = `mock-token-${newUserId}-${Date.now()}`;

  return res.status(201).json({
    success: true,
    message: 'Registration successful.',
    token,
    user: newUser
  });
});

// 8. Delegate all other routes to json-server
app.use(jsonServerApp);

// 9. Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 EventHub Mock API & Secure Auth Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔐 Auth Endpoints:`);
  console.log(`   - POST http://localhost:${PORT}/auth/login`);
  console.log(`   - POST http://localhost:${PORT}/auth/register`);
  console.log(`👥 Pre-configured Demo Accounts:`);
  console.log(`   - Super Admin: admin@eventhub.com    / admin123`);
  console.log(`   - Host:        host@eventhub.com     / host123`);
  console.log(`   - Management:  management@eventhub.com / manage123`);
  console.log(`   - Field Staff: staff@eventhub.com    / staff123`);
  console.log(`   - User:        jeet@eventhub.com     / password123`);
  console.log(`   *(Note: 'demo123' also accepted for all demo accounts)*`);
  console.log(`======================================================\n`);
});

