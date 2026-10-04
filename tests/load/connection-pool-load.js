import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 concurrent users
    { duration: '1m', target: 50 },   // Scale to 50 concurrent users
    { duration: '1m', target: 100 },  // Peak load: 100 concurrent users
    { duration: '30s', target: 0 },   // Graceful ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<250'], // 95% of queries under 100ms
    http_req_failed: ['rate<0.01'],                 // Under 1% failure rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api/v1';

export default function () {
  // 1. Health check & pool metrics probe (verifying connection pool responsiveness)
  const healthRes = http.get(`${BASE_URL}/health/readiness`);
  check(healthRes, {
    'readiness returns 200': (r) => r.status === 200,
    'database is up': (r) => JSON.parse(r.body).checks.database === 'up',
  });

  // 2. High-frequency read queries (Master data & catalog lookups)
  const productsRes = http.get(`${BASE_URL}/master-data/products?brand=Fresh`);
  check(productsRes, {
    'products query status 200': (r) => r.status === 200,
  });

  // 3. Outlet store directory queries
  const outletsRes = http.get(`${BASE_URL}/master-data/outlets?district=Gampaha`);
  check(outletsRes, {
    'outlets query status 200': (r) => r.status === 200,
  });

  // Jitter sleep between requests (0.5s - 1.5s simulating human and mobile telemetry intervals)
  sleep(0.5 + Math.random());
}
