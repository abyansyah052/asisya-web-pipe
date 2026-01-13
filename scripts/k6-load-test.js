// K6 Load Test Script for Asisya Web
// Target: 800-1000 concurrent users
// Run: k6 run --vus 800 --duration 2m scripts/k6-load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const apiDuration = new Trend('api_duration');

// Test configuration
export const options = {
  // Stages for gradual ramp-up
  stages: [
    { duration: '30s', target: 200 },   // Warm up to 200 users
    { duration: '30s', target: 500 },   // Scale up to 500
    { duration: '1m', target: 800 },    // Peak at 800 users
    { duration: '1m', target: 1000 },   // Stress test at 1000
    { duration: '30s', target: 500 },   // Scale down
    { duration: '30s', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests under 3s
    http_req_failed: ['rate<0.10'],      // Error rate < 10%
    errors: ['rate<0.10'],
  },
};

// Base URL - change for production
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testUsers = [
  { email: 'admin@example.com', password: 'password123' },
  { email: 'test@example.com', password: 'password123' },
];

// Test scenarios
export default function () {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Scenario 1: Homepage load
  testHomepage();
  
  // Scenario 2: Login flow (10% of users)
  if (Math.random() < 0.1) {
    testLogin(user);
  }
  
  // Scenario 3: API endpoints
  testAPIEndpoints();
  
  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

function testHomepage() {
  const res = http.get(`${BASE_URL}/`, {
    tags: { name: 'Homepage' },
  });
  
  const success = check(res, {
    'homepage status 200': (r) => r.status === 200,
    'homepage loads fast': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
}

function testLogin(user) {
  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'Login' },
  };
  
  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  loginDuration.add(Date.now() - start);
  
  const success = check(res, {
    'login responds': (r) => r.status === 200 || r.status === 401,
    'login fast': (r) => r.timings.duration < 3000,
  });
  
  errorRate.add(!success);
}

function testAPIEndpoints() {
  const endpoints = [
    { url: '/api/settings/branding', name: 'Branding' },
  ];
  
  endpoints.forEach((endpoint) => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}${endpoint.url}`, {
      tags: { name: endpoint.name },
    });
    apiDuration.add(Date.now() - start);
    
    const success = check(res, {
      [`${endpoint.name} responds`]: (r) => r.status < 500,
      [`${endpoint.name} fast`]: (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(!success);
  });
}

// Stress test for candidate dashboard simulation
export function candidateDashboard() {
  const batch = http.batch([
    ['GET', `${BASE_URL}/`, { tags: { name: 'Home' } }],
    ['GET', `${BASE_URL}/api/settings/branding`, { tags: { name: 'Branding' } }],
  ]);
  
  batch.forEach((res, i) => {
    check(res, {
      'batch request OK': (r) => r.status < 500,
    });
  });
}

export function handleSummary(data) {
  return {
    'k6-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const metrics = data.metrics;
  
  let summary = `
╔══════════════════════════════════════════════════════════════════════╗
║                     ASISYA WEB - K6 LOAD TEST RESULTS                ║
╠══════════════════════════════════════════════════════════════════════╣
║ Total Requests:     ${(metrics.http_reqs?.values?.count || 0).toString().padStart(10)}                                   ║
║ Failed Requests:    ${(metrics.http_req_failed?.values?.passes || 0).toString().padStart(10)}                                   ║
║ Error Rate:         ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2).padStart(10)}%                                  ║
╠══════════════════════════════════════════════════════════════════════╣
║ Response Times (ms):                                                 ║
║   - Average:        ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2).padStart(10)}                                   ║
║   - Median:         ${(metrics.http_req_duration?.values?.med || 0).toFixed(2).padStart(10)}                                   ║
║   - 90th %ile:      ${(metrics.http_req_duration?.values?.['p(90)'] || 0).toFixed(2).padStart(10)}                                   ║
║   - 95th %ile:      ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2).padStart(10)}                                   ║
║   - Max:            ${(metrics.http_req_duration?.values?.max || 0).toFixed(2).padStart(10)}                                   ║
╠══════════════════════════════════════════════════════════════════════╣
║ Data:                                                                ║
║   - Received:       ${formatBytes(metrics.data_received?.values?.count || 0).padStart(10)}                                   ║
║   - Sent:           ${formatBytes(metrics.data_sent?.values?.count || 0).padStart(10)}                                   ║
╚══════════════════════════════════════════════════════════════════════╝
`;
  
  return summary;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
