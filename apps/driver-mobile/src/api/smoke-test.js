#!/usr/bin/env node

const baseUrl = process.env.CARS_API_BASE_URL ?? "https://carsdispatch.vercel.app";
const email = process.env.CARS_DRIVER_EMAIL ?? "driver@esc.example";
const accessCode = process.env.MOBILE_LOGIN_CODE ?? "";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return payload.data;
}

async function main() {
  const session = await request("/api/mobile/auth/login", {
    method: "POST",
    body: {
      email,
      accessCode,
      deviceName: "Release smoke test"
    }
  });
  const manifest = await request("/api/mobile/driver/manifest", {
    token: session.token
  });

  await request("/api/mobile/auth/logout", {
    method: "POST",
    token: session.token
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        driver: session.driver.name,
        organization: session.organization.name,
        assignmentCount: manifest.assignments.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
