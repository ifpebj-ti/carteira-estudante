import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const STUDENT_LOGIN = __ENV.STUDENT_LOGIN || "";
const STUDENT_PASSWORD = __ENV.STUDENT_PASSWORD || "";
const ADMIN_LOGIN = __ENV.ADMIN_LOGIN || "";
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || "";

const baselineLatency = new Trend("baseline_req_duration", true);
const baselineErrorRate = new Rate("baseline_req_failed");
const baselineRequests = new Counter("baseline_reqs");

const stressLatency = new Trend("stress_req_duration", true);
const stressErrorRate = new Rate("stress_req_failed");
const stressRequests = new Counter("stress_reqs");

export const options = {
  scenarios: {
    baseline_100_concurrent: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 },
        { duration: "20s", target: 100 },
        { duration: "5s", target: 0 },
      ],
      gracefulRampDown: "5s",
      exec: "runBaselineScenario",
      tags: { scenario_group: "baseline_100" },
    },
    stress_peak_1000_concurrent: {
      executor: "ramping-vus",
      startTime: "40s",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 300 },
        { duration: "15s", target: 1000 },
        { duration: "15s", target: 1000 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "5s",
      exec: "runStressScenario",
      tags: { scenario_group: "stress_1000" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"],
    baseline_req_failed: ["rate<0.05"],
    baseline_req_duration: ["p(95)<500"],
    "http_req_duration{endpoint:health}": ["p(95)<500"],
    "http_req_duration{endpoint:person_me}": ["p(95)<500"],
    "http_req_duration{endpoint:person_detail}": ["p(95)<500"],
    "http_req_duration{endpoint:person_login}": ["p(95)<2000"],
  },
};

export function setup() {
  const healthRes = http.get(`${BASE_URL}/health`, {
    tags: { endpoint: "setup_health" },
  });
  check(healthRes, {
    "setup health returns 200": (r) => r.status === 200,
  });

  const jsonHeaders = { "Content-Type": "application/json" };
  let studentToken = null;
  let adminToken = null;

  if (STUDENT_LOGIN && STUDENT_PASSWORD) {
    const studentLoginRes = http.post(
      `${BASE_URL}/api/v1/auth/pessoa/login`,
      JSON.stringify({ login: STUDENT_LOGIN, senha: STUDENT_PASSWORD }),
      { headers: jsonHeaders, tags: { endpoint: "setup_student_login" } }
    );
    if (studentLoginRes.status === 200) {
      studentToken = studentLoginRes.json("access_token");
    }
  }

  if (ADMIN_LOGIN && ADMIN_PASSWORD) {
    const adminLoginRes = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ login: ADMIN_LOGIN, senha: ADMIN_PASSWORD }),
      { headers: jsonHeaders, tags: { endpoint: "setup_admin_login" } }
    );
    if (adminLoginRes.status === 200) {
      adminToken = adminLoginRes.json("access_token");
    }
  }

  http.cookieJar().clear(BASE_URL);

  return {
    studentToken,
    adminToken,
    studentRegistration: STUDENT_LOGIN,
  };
}

function executeMixedRequest(authData) {
  const roll = Math.random();

  if (roll < 0.45 || !authData.studentToken) {
    const res = http.get(`${BASE_URL}/health`, {
      tags: { endpoint: "health" },
      timeout: "10s",
    });
    const ok = check(res, {
      "health status is 200": (r) => r.status === 200,
    });
    return { res, ok };
  }

  if (roll < 0.8) {
    const res = http.get(`${BASE_URL}/api/v1/auth/pessoa/me`, {
      headers: { Authorization: `Bearer ${authData.studentToken}` },
      tags: { endpoint: "person_me" },
      timeout: "10s",
    });
    const ok = check(res, {
      "person_me status is 200": (r) => r.status === 200,
    });
    return { res, ok };
  }

  if (roll < 0.95 && authData.adminToken) {
    const res = http.get(
      `${BASE_URL}/api/v1/pessoas/${authData.studentRegistration}`,
      {
        headers: { Authorization: `Bearer ${authData.adminToken}` },
        tags: { endpoint: "person_detail" },
        timeout: "10s",
      }
    );
    const ok = check(res, {
      "person_detail status is 200": (r) => r.status === 200,
    });
    return { res, ok };
  }

  const res = http.post(
    `${BASE_URL}/api/v1/auth/pessoa/login`,
    JSON.stringify({ login: STUDENT_LOGIN, senha: STUDENT_PASSWORD }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "person_login" },
      timeout: "10s",
    }
  );
  http.cookieJar().clear(BASE_URL);
  const ok = check(res, {
    "person_login status is 200": (r) => r.status === 200,
  });
  return { res, ok };
}

export function runBaselineScenario(authData) {
  const { res, ok } = executeMixedRequest(authData);
  baselineRequests.add(1);
  baselineLatency.add(res.timings.duration);
  baselineErrorRate.add(!ok || res.status >= 400 || res.status === 0);
  sleep(0.2);
}

export function runStressScenario(authData) {
  const { res, ok } = executeMixedRequest(authData);
  stressRequests.add(1);
  stressLatency.add(res.timings.duration);
  stressErrorRate.add(!ok || res.status >= 400 || res.status === 0);
  sleep(0.2);
}
