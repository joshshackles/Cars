const { spawnSync } = require("node:child_process");
const path = require("node:path");

const env = { ...process.env };

function run(command, args) {
  const executable = process.execPath;
  const commandArgs =
    command === "node"
      ? args
      : [path.join(process.cwd(), "node_modules", command, command === "next" ? "dist/bin/next" : "build/index.js"), ...args];

  const result = spawnSync(executable, commandArgs, {
    env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const skipDatabaseBootstrap = env.CARS_SKIP_DB_BOOTSTRAP === "true";

if (!skipDatabaseBootstrap) {
  if (!env.DATABASE_URL) {
    console.error("DATABASE_URL is required for Vercel builds so Prisma can initialize the Neon database.");
    process.exit(1);
  }

  if (!env.DIRECT_URL) {
    env.DIRECT_URL = env.DATABASE_URL;
    console.warn("DIRECT_URL is not set. Falling back to DATABASE_URL for the Prisma build step.");
    console.warn("For Neon, set DIRECT_URL to the direct non-pooler connection string in Vercel.");
  }

  run("prisma", ["db", "push", "--skip-generate"]);
  run("node", ["prisma/bootstrap-production.js"]);
} else {
  console.log("Skipping database bootstrap because CARS_SKIP_DB_BOOTSTRAP=true.");
}

run("prisma", ["generate"]);
run("next", ["build"]);
