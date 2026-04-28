import { spawn } from "node:child_process";
import process from "node:process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];

function start(command, args, label) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const runningChild of children) {
      if (runningChild.pid && runningChild.pid !== child.pid) {
        runningChild.kill();
      }
    }
    process.exit(code ?? 0);
  });

  children.push(child);
  console.log(`[${label}] started`);
  return child;
}

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.pid) {
      child.kill();
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);

start(process.execPath, ["server/index.js"], "api");
start(npmCommand, ["run", "dev:ui"], "vite");
