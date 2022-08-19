// the code in this file is from https://github.com/nrwl/nx/blob/master/e2e/utils/index.ts

import { getPackageManagerCommand } from '@nrwl/devkit';
import { tmpProjPath } from '@nrwl/nx-plugin/testing';
import chalk from 'chalk';
import { ChildProcess, exec, execSync } from 'child_process';
import kill from 'kill-port';
import { dirname } from 'path';
import { check as portCheck } from 'tcp-port-used';
import { setTimeout } from 'timers/promises';
import treeKill from 'tree-kill';
import { promisify } from 'util';

const E2E_LOG_PREFIX = `${chalk.reset.inverse.bold.keyword('orange')(' E2E ')}`;

function e2eConsoleLogger(message: string, body?: string) {
  process.stdout.write('\n');
  process.stdout.write(`${E2E_LOG_PREFIX} ${message}\n`);
  if (body) {
    process.stdout.write(`${body}\n`);
  }
  process.stdout.write('\n');
}

export function logInfo(title: string, body?: string) {
  const label = chalk.reset.inverse.bold.white(' INFO ');
  const message = `${label} ${chalk.bold.white(title)}`;
  return e2eConsoleLogger(message, body);
}

export function logWarn(title: string, body?: string) {
  const label = chalk.reset.inverse.bold.keyword('orange')(' WARN ');
  const message = `${label} ${chalk.bold.white(title)}`;
  return e2eConsoleLogger(message, body);
}

export function logError(title: string, body?: string) {
  const label = chalk.reset.inverse.bold.red(' ERROR ');
  const message = `${label} ${chalk.bold.red(title)}`;
  return e2eConsoleLogger(message, body);
}

export function logSuccess(title: string, body?: string) {
  const label = chalk.reset.inverse.bold.green(' SUCCESS ');
  const message = `${label} ${chalk.bold.green(title)}`;
  return e2eConsoleLogger(message, body);
}

/**
 * Remove log colors for fail proof string search
 * @param log
 * @returns
 */
function stripConsoleColors(log: string): string {
  return log.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
}

export function runCommandUntil(
  command: string,
  criteria: (output: string) => boolean
): Promise<ChildProcess> {
  const pm = getPackageManagerCommand();

  const p = exec(pm.run('nx', command), {
    cwd: tmpProjPath(),
    env: {
      ...process.env,
      FORCE_COLOR: 'false',
      NX_INVOKED_BY_RUNNER: undefined,
    },
    encoding: 'utf-8',
  });

  return new Promise((resolve, reject) => {
    let output = '';
    let complete = false;

    function checkCriteria(c: Buffer) {
      output += c.toString();
      if (criteria(stripConsoleColors(output)) && !complete) {
        complete = true;
        resolve(p);
      }
    }

    p.stdout?.on('data', checkCriteria);
    p.stderr?.on('data', checkCriteria);

    p.on('exit', (code) => {
      if (!complete) {
        reject(`Exited with ${code}`);
      } else {
        resolve(p);
      }
    });
  });
}

export const promisifiedTreeKill: (
  pid: number,
  signal: string
) => Promise<void> = promisify(treeKill);

const KILL_PORT_DELAY = 5000;

async function killPort(port: number): Promise<boolean> {
  if (await portCheck(port)) {
    try {
      logInfo(`Attempting to close port ${port}`);

      await kill(port);
      await setTimeout(KILL_PORT_DELAY);

      if (await portCheck(port)) {
        logError(`Port ${port} still open`);
      } else {
        logSuccess(`Port ${port} successfully closed`);
        return true;
      }
    } catch {
      logError(`Port ${port} closing failed`);
    }
    return false;
  } else {
    return true;
  }
}

export async function killPorts(ports: number[]): Promise<boolean> {
  const results = await Promise.all(ports.map(killPort));
  return results.every((r) => r);
}

export async function killProcess(
  { pid }: ChildProcess,
  ports: number[] = [3333, 4200]
) {
  try {
    if (pid) {
      await promisifiedTreeKill(pid, 'SIGKILL');
    }
    expect(await killPorts(ports)).toBeTruthy();
  } catch (err) {
    expect(err).toBeFalsy();
  }
}

export function runNxNewCommand(args: string, silent: boolean) {
  const localTmpDir = dirname(tmpProjPath());
  const nxBin = require.resolve('nx');
  args ||= '';

  return execSync(
    `node ${nxBin} new proj --nx-workspace-root=${localTmpDir} --no-interactive --skip-install --collection=@nrwl/workspace --npmScope=proj --preset=empty ${args}`,
    {
      cwd: localTmpDir,
      ...(silent ? { stdio: ['ignore', 'ignore', 'ignore'] } : {}),
    }
  );
}
