import {
  expectTestsPass,
  runNxCommandAsync,
  updateFile,
} from '@nrwl/nx-plugin/testing';
import {
  installDevDependencies,
  NX_VERSION,
  readBlackboxEnv,
  serveProject,
  setupDockerfileInNodeApp,
  setupE2E,
} from '@nx-plugins/e2e-utils';

describe('nx-openapi-client e2e', () => {
  let projName: string;

  beforeEach(() => {
    projName = setupE2E('nx-openapi-client');
  }, 240_000);

  it('should create project and run successfully', async () => {
    await installDevDependencies(`@nrwl/nest@${NX_VERSION}`);

    await runNxCommandAsync(`generate @gioragutt/nx-nest:app ${projName}`);

    setupDockerfileInNodeApp(projName);

    const { PORT: port } = readBlackboxEnv(projName);

    await serveProject(
      projName,
      `Application is running on: http://localhost:${port}/swagger`,
      async () => {
        await runNxCommandAsync(`generate-sources ${projName}-client`);
      }
    );

    await runNxCommandAsync(`build ${projName}-client`);

    updateFile(
      `apps/${projName}-e2e/src/index.spec.ts`,
      `import fetch from 'node-fetch';

import { ExampleApi, Configuration } from '@gioragutt/${projName}-client';

const client = new ExampleApi(
  new Configuration({
    basePath: 'http://localhost:${port}',
    headers: {
      ['x-api-client']: 'blackbox',
      ['x-api-client-version']: '1.0.0',
    },
    fetchApi: fetch as any,
  }),
);

it('should work correctly', async () => {
  const json = await client.getData();
  expect(json).toMatchObject({message: 'Welcome to ${projName}!'})
})`
    );

    const output = await runNxCommandAsync(`e2e ${projName}-e2e`);
    expectTestsPass(output);
  }, 360_000);
});
