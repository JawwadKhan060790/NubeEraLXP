/**
 * k6 Load Test Script — NubeEra LMS API (NubeEra_DB_2)
 *
 * Usage:
 *   k6 run k6-load-test.js                          # default 100 VUs, 1 min
 *   k6 run --vus 500 --duration 2m k6-load-test.js  # 500 VUs, 2 min
 *   k6 run --vus 1000 k6-load-test.js               # 1000 VUs
 *
 * Scenarios:
 *   smoke   :   5 VUs  × 30s  — quick sanity check
 *   load    : 100 VUs  × 2m   — baseline load test
 *   stress  : 500 VUs  × 3m   — stress test
 *   spike   : 2000 VUs × 30s  — spike test
 *   soak    :  50 VUs  × 30m  — soak test (run manually)
 *
 * Requirements:
 *   k6 installed (https://k6.io/docs/getting-started/installation/)
 *   API running at http://localhost:5046 (or set API_BASE env var)
 *   NubeEra_DB_2 seeded (run NubeEra.Seeder first)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Configuration ──────────────────────────────────────────────────────────
const API_BASE = __ENV.API_BASE || 'http://localhost:5046';

// Seeded test users from NubeEra_DB_2
const USERS = [
  { email: 's1@student.sch001.edu',     password: '123456', role: 'Student'   },
  { email: 's100@student.sch020.edu',   password: '123456', role: 'Student'   },
  { email: 's500@student.sch100.edu',   password: '123456', role: 'Student'   },
  { email: 't1@sch001.edu',             password: '123456', role: 'Teacher'   },
  { email: 't50@sch050.edu',            password: '123456', role: 'Teacher'   },
  { email: 't100@sch100.edu',           password: '123456', role: 'Teacher'   },
  { email: 'p1@parent.sch001.edu',      password: '123456', role: 'Parent'    },
  { email: 'principal1@sch001.edu',     password: '123456', role: 'Principal' },
  { email: 'principal50@sch050.edu',    password: '123456', role: 'Principal' },
];

// ── Custom Metrics ─────────────────────────────────────────────────────────
const loginDuration     = new Trend('login_duration_ms',     true);
const dashboardDuration = new Trend('dashboard_duration_ms', true);
const apiDuration       = new Trend('api_duration_ms',       true);
const errorRate         = new Rate('error_rate');
const totalRequests     = new Counter('total_requests');

// ── Test Scenarios ─────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus:      5,
      duration: '30s',
      tags:     { scenario: 'smoke' },
    },
    load: {
      executor:    'ramping-vus',
      startVUs:    0,
      startTime:   '35s',
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m',  target: 100 },
        { duration: '30s', target: 0   },
      ],
      tags: { scenario: 'load' },
    },
    stress: {
      executor:  'ramping-vus',
      startVUs:  0,
      startTime: '3m',
      stages: [
        { duration: '30s', target: 200 },
        { duration: '1m',  target: 500 },
        { duration: '30s', target: 0   },
      ],
      tags: { scenario: 'stress' },
    },
    spike: {
      executor:  'ramping-vus',
      startVUs:  0,
      startTime: '6m',
      stages: [
        { duration: '10s', target: 2000 },
        { duration: '20s', target: 2000 },
        { duration: '10s', target: 0    },
      ],
      tags: { scenario: 'spike' },
    },
  },
  thresholds: {
    // Performance targets from requirements
    'login_duration_ms':     ['p(95)<2000'],   // Login < 2s at P95
    'dashboard_duration_ms': ['p(95)<3000'],   // Dashboard < 3s at P95
    'api_duration_ms':       ['p(95)<500'],    // API list < 500ms at P95
    'error_rate':            ['rate<0.05'],    // Error rate < 5%
    'http_req_duration':     ['p(99)<5000'],   // No request > 5s at P99
  },
};

// ── Setup: login and cache tokens ──────────────────────────────────────────
export function setup() {
  const tokens = {};
  for (const user of USERS) {
    const res = http.post(
      `${API_BASE}/api/auth/login`,
      JSON.stringify({ Email: user.email, Password: user.password }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const token = body?.data?.token
                   || body?.data?.accessToken
                   || body?.token
                   || body?.accessToken;
        if (token) tokens[user.email] = { token, role: user.role };
      } catch (_) {}
    }
  }
  console.log(`Setup complete — ${Object.keys(tokens).length}/${USERS.length} tokens acquired`);
  return { tokens };
}

// ── Main VU function ───────────────────────────────────────────────────────
export default function (data) {
  const userEmails = Object.keys(data.tokens);
  if (userEmails.length === 0) {
    console.error('No tokens available — check API connectivity');
    sleep(1);
    return;
  }

  // Each VU picks a user round-robin
  const email    = userEmails[__VU % userEmails.length];
  const { token, role } = data.tokens[email];
  const headers  = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };

  totalRequests.add(1);

  // ── Group: Authentication ──────────────────────────────────────────────
  group('auth', () => {
    const start = Date.now();
    const res   = http.post(
      `${API_BASE}/api/auth/login`,
      JSON.stringify({ Email: email, Password: '123456' }),
      { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } }
    );
    loginDuration.add(Date.now() - start);
    const ok = check(res, {
      'login status 200': r => r.status === 200,
      'login returns token': r => {
        try { const b = JSON.parse(r.body); return !!(b?.data?.token || b?.token); }
        catch { return false; }
      },
    });
    errorRate.add(!ok);
  });

  sleep(0.1);

  // ── Group: Dashboard ───────────────────────────────────────────────────
  group('dashboard', () => {
    const start = Date.now();
    const res   = http.get(`${API_BASE}/api/dashboard`, { headers, tags: { endpoint: 'dashboard' } });
    dashboardDuration.add(Date.now() - start);
    const ok = check(res, { 'dashboard 200 or 404': r => r.status === 200 || r.status === 404 });
    errorRate.add(!ok);
  });

  sleep(0.1);

  // ── Group: Data Endpoints ──────────────────────────────────────────────
  group('data', () => {
    const endpoints = getEndpointsForRole(role);
    for (const ep of endpoints) {
      const start = Date.now();
      const res   = http.get(`${API_BASE}${ep}`, { headers, tags: { endpoint: ep } });
      apiDuration.add(Date.now() - start);
      const ok = check(res, { [`${ep} ok`]: r => r.status < 400 });
      errorRate.add(!ok);
      sleep(0.05);
    }
  });

  sleep(randomBetween(0.5, 1.5));
}

// ── Teardown: print summary ────────────────────────────────────────────────
export function teardown(data) {
  console.log('Load test complete. Check k6 summary for results.');
}

// ── Role-based endpoint sets ───────────────────────────────────────────────
function getEndpointsForRole(role) {
  switch (role) {
    case 'Student':
      return [
        '/api/lessons?page=1&pageSize=10',
        '/api/report-cards/my',
        '/api/attendance?page=1&pageSize=10',
        '/api/exams?page=1&pageSize=10',
      ];
    case 'Teacher':
      return [
        '/api/students?page=1&pageSize=10',
        '/api/lessons?page=1&pageSize=10',
        '/api/grades?page=1&pageSize=10',
        '/api/report-cards?page=1&pageSize=10',
      ];
    case 'Parent':
      return [
        '/api/report-cards/children',
        '/api/notifications?page=1&pageSize=10',
      ];
    case 'Principal':
      return [
        '/api/students?page=1&pageSize=10',
        '/api/teachers?page=1&pageSize=10',
        '/api/grades?page=1&pageSize=10',
        '/api/report-cards?page=1&pageSize=10',
        '/api/tickets?page=1&pageSize=10',
      ];
    default:
      return ['/api/schools?page=1&pageSize=10'];
  }
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
