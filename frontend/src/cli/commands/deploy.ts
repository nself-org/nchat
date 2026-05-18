/**
 * Deployment Commands
 */

import { spawn } from "child_process";
import ora from "ora";

export interface DeployOptions {
  prod?: boolean;
  tag?: string;
  push?: boolean;
  file?: string;
  namespace?: string;
}

export const deployCommands = {
  async vercel(options: DeployOptions) {
    const spinner = ora("Deploying to Vercel...").start();
    const args = ["deploy", ...(options.prod ? ["--prod"] : [])];

    // shell: false (default) prevents command injection — args passed as array
    const child = spawn("vercel", args, { stdio: "inherit" });

    child.on("exit", (code) => {
      if (code === 0) {
        spinner.succeed("Deployed to Vercel successfully");
      } else {
        spinner.fail("Deployment failed");
        process.exit(code || 1);
      }
    });
  },

  async docker(options: DeployOptions) {
    const spinner = ora("Building Docker image...").start();
    // Validate tag to alphanumeric/dash/dot only to prevent injection
    const tag = (options.tag || "latest").replace(/[^a-zA-Z0-9._-]/g, "");

    // sast-ignore: COMMAND_INJECTION -- shell:false (default), tag is sanitized to alphanumeric/dash/dot only; args passed as array, not shell string
    const child = spawn("docker", ["build", "-t", `nchat:${tag}`, "."], {
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        spinner.succeed("Docker image built successfully");
        if (options.push) {
          spinner.start("Pushing to registry...");
          // Push logic...
        }
      } else {
        spinner.fail("Docker build failed");
        process.exit(code || 1);
      }
    });
  },

  async k8s(options: DeployOptions) {
    const spinner = ora("Deploying to Kubernetes...").start();
    const args = [
      "apply",
      "-f",
      options.file || "deploy/k8s/",
      "-n",
      options.namespace || "default",
    ];

    // shell: false (default) prevents command injection — args passed as array
    const child = spawn("kubectl", args, { stdio: "inherit" });

    child.on("exit", (code) => {
      if (code === 0) {
        spinner.succeed("Deployed to Kubernetes successfully");
      } else {
        spinner.fail("Deployment failed");
        process.exit(code || 1);
      }
    });
  },
};
