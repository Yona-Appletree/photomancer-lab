import { spawn } from "node:child_process";

const children = [
  spawn("node", ["scripts/ts-posts.mjs", "dev"], { stdio: "inherit" }),
  spawn("hugo", ["server", "-D", "--disableFastRender"], { stdio: "inherit" }),
];

const shutdown = (signal) => {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const exitCodes = await Promise.all(
  children.map(
    (child) =>
      new Promise((resolve) => {
        child.on("exit", (code, signal) => resolve({ code, signal }));
      }),
  ),
);

const failed = exitCodes.find((result) => result.code && result.code !== 0);
if (failed) process.exitCode = failed.code;
