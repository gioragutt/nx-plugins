import { ExecutorContext } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { generateSourcesExecutor } from './executor';

jest.mock('child_process');

describe('GenerateSources Executor', () => {
  it('can run', async () => {
    const output = await generateSourcesExecutor(
      {
        generator: 'some-generator',
        outputPath: 'some-output-path',
        specUrl: 'some-spec-url',
        additionalProperties: { helloWorld: 'fooBar', barBaz: 123 },
        globalProperties: { 'should-work': 'nicely' },
        typeMappings: { thisIsWorking: true },
      },
      { projectName: 'some-project' } as ExecutorContext
    );

    expect(output.success).toBe(true);

    const generatorFlags = [
      'generate',
      '-i',
      'some-spec-url',
      '-g',
      'some-generator',
      '-o',
      'some-output-path',
      '--additional-properties',
      'helloWorld=fooBar,barBaz=123',
      '--type-mappings',
      'thisIsWorking=true',
      '--global-property',
      'should-work=nicely',
    ].join(' ');

    expect(execSync).toHaveBeenCalledWith(
      `yarn -s openapi-generator-cli ${generatorFlags}`,
      expect.anything()
    );

    expect(execSync).toHaveBeenCalledWith(
      'yarn -s nx format:write --projects some-project',
      expect.anything()
    );
  });
});
