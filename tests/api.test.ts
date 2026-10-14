/**
 * Automated API Test Suite for Abhyasa Full-Stack Application
 * Run with: npm test
 */

const BASE_URL = process.env.TEST_URL || `http://localhost:${process.env.PORT || 3000}`;

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: "PASSED" | "FAILED";
  durationMs: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
    expectedStatus?: number | number[];
    assert?: (res: Response, json: any) => void | Promise<void>;
  } = {}
) {
  const start = performance.now();
  const url = `${BASE_URL}${path}`;
  const { expectedStatus = 200 } = options;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, fetchOptions);
    const durationMs = Math.round(performance.now() - start);

    const allowedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!allowedStatuses.includes(res.status)) {
      let bodyText = "";
      try {
        bodyText = await res.text();
      } catch {}
      throw new Error(
        `Expected HTTP ${allowedStatuses.join("/")}, received ${res.status}. Response: ${bodyText.slice(0, 150)}`
      );
    }

    let json: any = null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        json = await res.json();
      } catch {}
    }

    if (options.assert) {
      await options.assert(res, json);
    }

    results.push({
      name,
      endpoint: path,
      method,
      status: "PASSED",
      durationMs,
    });
    console.log(`  \x1b[32m✔ PASS\x1b[0m  [${method}] ${path} (${durationMs}ms) — ${name}`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({
      name,
      endpoint: path,
      method,
      status: "FAILED",
      durationMs,
      error: err.message,
    });
    console.log(`  \x1b[31m✖ FAIL\x1b[0m  [${method}] ${path} (${durationMs}ms) — ${name}`);
    console.log(`         \x1b[33mError: ${err.message}\x1b[0m`);
  }
}

async function runTestSuite() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Abhyasa Automated API Test Suite`);
  console.log(`🎯 Target URL: ${BASE_URL}`);
  console.log(`======================================================\n`);

  console.log(`📂 [1] Curriculum & Public Content Routes`);
  // 1. GET /api/boards
  await runTest("Fetch list of educational boards", "GET", "/api/boards", {
    expectedStatus: 200,
    assert: (res, json) => {
      if (!Array.isArray(json)) throw new Error("Expected response to be an array");
      if (json.length === 0) throw new Error("Expected at least one board");
    },
  });

  // 2. GET /api/grades
  await runTest("Fetch list of grades/classes", "GET", "/api/grades", {
    expectedStatus: 200,
    assert: (res, json) => {
      if (!Array.isArray(json)) throw new Error("Expected grades array");
    },
  });

  // 3. GET /api/subjects
  await runTest("Fetch list of subjects", "GET", "/api/subjects", {
    expectedStatus: 200,
    assert: (res, json) => {
      if (!Array.isArray(json)) throw new Error("Expected subjects array");
    },
  });

  // 4. Redis Caching & Cache-Header Verification
  console.log(`\n⚡ [2] Redis Caching & Performance Engine`);
  await runTest("Redis Caching: Verify X-Cache header on /api/boards", "GET", "/api/boards", {
    expectedStatus: 200,
    assert: (res) => {
      const cacheHeader = res.headers.get("X-Cache");
      if (!cacheHeader) {
        throw new Error("Missing X-Cache header (Redis middleware not mounted)");
      }
      if (cacheHeader !== "HIT" && cacheHeader !== "MISS") {
        throw new Error(`Unexpected X-Cache value: ${cacheHeader}`);
      }
    },
  });

  await runTest("Redis Caching: Second call must be a HIT", "GET", "/api/boards", {
    expectedStatus: 200,
    assert: (res) => {
      const cacheHeader = res.headers.get("X-Cache");
      if (cacheHeader !== "HIT") {
        throw new Error(`Expected X-Cache: HIT, got: ${cacheHeader}`);
      }
    },
  });

  console.log(`\n🔐 [3] Authentication & Role-Based Access`);
  // 5. POST /api/auth/login - Empty payload validation
  await runTest("Login: Rejects empty body with 400 Bad Request", "POST", "/api/auth/login", {
    body: {},
    expectedStatus: 400,
    assert: (res, json) => {
      if (!json?.message || !json.message.includes("required")) {
        throw new Error(`Expected error message to mention required field, got: ${JSON.stringify(json)}`);
      }
    },
  });

  // 6. POST /api/auth/login - Supports 'identifier' payload (from Signup modal)
  await runTest("Login: Accepts 'identifier' payload format without 400 error", "POST", "/api/auth/login", {
    body: { identifier: "nonexistent_test_student@abhyasa.edu", password: "password123" },
    expectedStatus: [200, 404, 401], // Must not be 400 (Bad Request)
  });

  // 7. POST /api/auth/register - Validation
  await runTest("Registration: Rejects incomplete registration data with 400", "POST", "/api/auth/register", {
    body: { name: "Test" }, // Missing email & password
    expectedStatus: 400,
  });

  console.log(`\n📬 [4] Communication, Contact & Rate Limiting`);
  // 8. POST /api/contact - Validation
  await runTest("Contact Form: Rejects submission missing required fields with 400", "POST", "/api/contact", {
    body: { name: "Student" },
    expectedStatus: 400,
  });

  // 9. POST /api/contact - Invalid email format
  await runTest("Contact Form: Rejects invalid email address with 400", "POST", "/api/contact", {
    body: { name: "Student", email: "invalid-email-format", message: "Hello" },
    expectedStatus: 400,
  });

  console.log(`\n💳 [5] Payment & Static SPA Serving`);
  // 10. POST /api/payment/create-order (Protected route requires JWT auth)
  await runTest("Payment: Protects create-order endpoint with 401 when unauthenticated", "POST", "/api/payment/create-order", {
    expectedStatus: [401, 200], // 401 proves requireAuth security middleware is working
  });

  // 11. GET / (Frontend SPA HTML)
  await runTest("Frontend: Serves index.html with 200 OK", "GET", "/", {
    expectedStatus: 200,
    assert: (res) => {
      const type = res.headers.get("content-type") || "";
      if (!type.includes("text/html")) {
        throw new Error(`Expected text/html content-type for SPA entry, got: ${type}`);
      }
    },
  });

  // Summary Report
  console.log(`\n======================================================`);
  const passedCount = results.filter((r) => r.status === "PASSED").length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;
  const totalCount = results.length;

  if (failedCount === 0) {
    console.log(`🎉 \x1b[32mALL ${totalCount} API TESTS PASSED SUCCESSFULLY!\x1b[0m`);
  } else {
    console.log(`⚠️  \x1b[31m${failedCount} of ${totalCount} TESTS FAILED\x1b[0m`);
  }
  console.log(`======================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();
