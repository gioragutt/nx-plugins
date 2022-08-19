import {
  expectTestsPass,
  runNxCommandAsync,
  updateFile,
} from '@nrwl/nx-plugin/testing';
import {
  installDevDependencies,
  NX_VERSION,
  setupDockerfileInNodeApp,
  setupE2E,
} from '@nx-plugins/e2e-utils';
import { execSync } from 'child_process';

function findRunningServiceContainer(projName: string): string | undefined {
  return execSync('docker ps', { encoding: 'utf-8' })
    .split('\n')
    .find((line) => line.includes(projName));
}

describe('nx-blackbox e2e', () => {
  let projName: string;

  beforeEach(() => {
    projName = setupE2E('nx-blackbox');
  }, 240_000);

  it('should not create a new blackbox project for an non-existing app', async () => {
    const result = await runNxCommandAsync(
      `generate @gioragutt/nx-blackbox:blackbox-project --project ${projName}`,
      { silenceError: true }
    );

    expect(result.stdout).toContain(
      `Cannot find configuration for '${projName}'`
    );
  });

  it('should create project and run successfully', async () => {
    await installDevDependencies(
      `@nrwl/nest@${NX_VERSION} node-fetch@^2 @types/node-fetch@^2`
    );

    await runNxCommandAsync(`generate @nrwl/nest:app ${projName}`);

    const port = 3693;

    await runNxCommandAsync(
      `generate @gioragutt/nx-blackbox:blackbox-project --project ${projName} --port ${port}`
    );

    setupDockerfileInNodeApp(projName);

    updateFile(
      `apps/${projName}-e2e/src/index.spec.ts`,
      `import fetch from 'node-fetch';

it('should work correctly', async () => {
  const res = await fetch('http://localhost:${port}/api');
  const json = await res.json();
  expect(json).toMatchObject({message: 'Welcome to ${projName}!'})
})`
    );

    const output = await runNxCommandAsync(`e2e ${projName}-e2e`);
    expectTestsPass(output);

    expect(findRunningServiceContainer(projName)).toBeUndefined();
  }, 360_000);
});
