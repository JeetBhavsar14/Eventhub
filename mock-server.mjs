import { App } from '@tinyhttp/app';
import { cors } from '@tinyhttp/cors';
import { json } from 'milliparsec';
import { createApp } from './node_modules/json-server/lib/app.js';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// 1. Lightweight environment file loader (.env -> .env.example fallback)
function loadEnv() {
  const envPath = path.resolve('.env');
  const examplePath = path.resolve('.env.example');
  const fileToRead = fs.existsSync(envPath) ? envPath : (fs.existsSync(examplePath) ? examplePath : null);
  if (fileToRead) {
    const content = fs.readFileSync(fileToRead, 'utf8').replace(/^\uFEFF/, '');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}
loadEnv();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_FILE = path.resolve('db.json');
const SEED_FILE = path.resolve('db.seed.example.json');
const JWT_SECRET = process.env.JWT_SECRET || 'eventhub-demo-cryptographic-jwt-secret-key-change-in-production';

// 2. Cryptographic JWT Helpers (HMAC-SHA256 with timing-safe verification)
export function signJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    exp: now + 86400 * 7 // 7 days expiration
  };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  const parts = cleanToken.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && claims.exp < now) {
      return null; // Expired
    }
    return claims;
  } catch {
    return null;
  }
}

// 3. Ensure db.json exists, initialized from seed without passwords
if (!fs.existsSync(DB_FILE)) {
  console.log('[Mock Server] db.json not found. Initializing from db.seed.example.json...');
  let seedContent = fs.readFileSync(SEED_FILE, 'utf8').replace(/^\uFEFF/, '');
  fs.writeFileSync(DB_FILE, seedContent, 'utf8');
}

// 4. Initialize LowDB and ensure zero passwords persist in db.json
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

// 5. Distinct, role-specific demo credentials loaded from environment variables
// (Universal fallback passwords completely eliminated)
const DEMO_CREDENTIALS = new Map([
  ['admin@eventhub.com', process.env.DEMO_ADMIN_PASSWORD || 'Admin@EventHub#2026'],
  ['host@eventhub.com', process.env.DEMO_HOST_PASSWORD || 'Host@EventHub#2026'],
  ['management@eventhub.com', process.env.DEMO_MANAGEMENT_PASSWORD || 'Manage@EventHub#2026'],
  ['staff@eventhub.com', process.env.DEMO_STAFF_PASSWORD || 'Staff@EventHub#2026'],
  ['jeet@eventhub.com', process.env.DEMO_USER_PASSWORD || 'User@EventHub#2026']
]);

// Track runtime-registered passwords in-memory
const REGISTERED_CREDENTIALS = new Map();

// 6. Create base json-server application & wrapper app
const jsonServerApp = createApp(db);
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

// 7. Secure Mock Auth Endpoint: POST /auth/login
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

  // Validate credentials against in-memory demo store or runtime registered store
  const expectedPassword = DEMO_CREDENTIALS.get(normalizedEmail) || REGISTERED_CREDENTIALS.get(normalizedEmail);

  if (!expectedPassword || expectedPassword !== trimmedPassword) {
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

  // Generate cryptographically signed HMAC-SHA256 JWT
  const token = signJwt({
    sub: safeUser.id,
    email: safeUser.email,
    role: safeUser.platformRole
  });

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    token,
    user: safeUser
  });
});

// 8. Cryptographic Token Verification Endpoint: GET /auth/me
app.get('/auth/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header missing.'
    });
  }

  const claims = verifyJwt(authHeader);
  if (!claims || !claims.sub) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or forged session token.'
    });
  }

  await db.read();
  const users = Array.isArray(db.data.users) ? db.data.users : [];
  const userRecord = users.find((u) => u.id === claims.sub);

  if (!userRecord) {
    return res.status(401).json({
      success: false,
      message: 'Session user no longer exists in database.'
    });
  }

  const { password: _removed, ...safeUser } = userRecord;

  return res.status(200).json({
    success: true,
    user: safeUser
  });
});

// 9. Secure Mock Auth Endpoint: POST /auth/register
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

  const token = signJwt({
    sub: newUserId,
    email: normalizedEmail,
    role: 'user'
  });

  return res.status(201).json({
    success: true,
    message: 'Registration successful.',
    token,
    user: newUser
  });
});

// 10. Delegate all other routes to json-server
app.use(jsonServerApp);

// 11. Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 EventHub Mock API & Cryptographic Auth Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔐 Cryptographic Security:`);
  console.log(`   - HMAC-SHA256 Token Signing Active (Node.js crypto)`);
  console.log(`   - Session Verification: GET http://localhost:${PORT}/auth/me`);
  console.log(`👥 Pre-configured Demo Accounts (Configured via .env):`);
  console.log(`   - Super Admin: admin@eventhub.com      [Role: admin]`);
  console.log(`   - Host:        host@eventhub.com       [Role: host]`);
  console.log(`   - Management:  management@eventhub.com [Role: management]`);
  console.log(`   - Field Staff: staff@eventhub.com      [Role: staff]`);
  console.log(`   - User:        jeet@eventhub.com       [Role: host/user]`);
  console.log(`   *(Passwords loaded from environment variables in .env)*`);
  console.log(`======================================================\n`);
});
