import { expectTestsPass, runNxCommandAsync } from '@nrwl/nx-plugin/testing';
import {
  installDevDependencies,
  NX_VERSION,
  readBlackboxEnv,
  serveProject,
  setupDockerfileInNodeApp,
  setupE2E,
} from '@nx-plugins/e2e-utils';
import fetch from 'node-fetch';

describe('nx-nest e2e', () => {
  let projName: string;

  beforeEach(() => {
    projName = setupE2E('nx-nest');
  }, 240_000);

  it('should create valid project', async () => {
    await installDevDependencies(`@nrwl/nest@${NX_VERSION}`);

    await runNxCommandAsync(`generate @gioragutt/nx-nest:app ${projName}`);

    setupDockerfileInNodeApp(projName);

    await runNxCommandAsync(`build ${projName}`);

    const output = await runNxCommandAsync(`e2e ${projName}-e2e`);
    expectTestsPass(output);
  }, 360_000);

  it('should have swagger properly set up', async () => {
    await runNxCommandAsync(`generate @gioragutt/nx-nest:app ${projName}`);

    const { PORT: port } = readBlackboxEnv(projName);

    await serveProject(
      projName,
      `Application is running on: http://localhost:${port}/swagger`,
      async () => {
        const swaggerJson = await fetch(
          `http://localhost:${port}/swagger-json`
        ).then((r) => r.json());

        expect(swaggerJson).toMatchObject({
          openapi: '3.0.0',
          paths: {
            '/': {
              get: {
                operationId: 'getData',
                parameters: [],
                responses: {
                  '200': {
                    description: '',
                    content: {
                      'application/json': {
                        schema: {
                          $ref: '#/components/schemas/MessageDto',
                        },
                      },
                    },
                  },
                },
                tags: ['Example'],
                security: [
                  {
                    oauth2: [],
                  },
                ],
              },
            },
          },
          info: {
            title: projName,
            version: '1.0',
          },
          components: {
            schemas: {
              MessageDto: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    description:
                      'This description will appear in the swagger document.',
                  },
                },
                required: ['message'],
              },
            },
          },
        });
      }
    );
  }, 360_000);
});
