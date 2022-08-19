import { readProjectConfiguration, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { readFileFromSource } from '@gioragutt/nx-plugin-utils';
import { nestApplicationGenerator } from './generator';
import { getPortForProject } from './lib/set-next-available-port-in-project';
import { ApplicationGeneratorSchema } from './schema';

describe('application generator', () => {
  let tree: Tree;
  const options: ApplicationGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await nestApplicationGenerator(tree, options);
    const config = readProjectConfiguration(tree, options.name);
    expect(config).toBeDefined();
  });

  it('should add node_modules to .dockerignore', async () => {
    await nestApplicationGenerator(tree, options);
    expect(tree.read('.dockerignore', 'utf-8')).toMatch(/node_modules/);
  });

  it('should have the type:service tag', async () => {
    await nestApplicationGenerator(tree, options);

    const config = readProjectConfiguration(tree, options.name);
    expect(config.tags).toContain('type:service');
  });

  it('should have generatePackageJson true', async () => {
    await nestApplicationGenerator(tree, options);

    const config = readProjectConfiguration(tree, options.name);
    expect(config.targets.build.options.generatePackageJson).toBe(true);
  });

  it('should have generatePackageJson true', async () => {
    await nestApplicationGenerator(tree, options);

    const config = readProjectConfiguration(tree, options.name);
    expect(config.targets.build.options.generatePackageJson).toBe(true);
  });

  it('should have @nestjs/swagger/plugin set up', async () => {
    await nestApplicationGenerator(tree, options);

    const config = readProjectConfiguration(tree, options.name);
    expect(config.targets.build.options.tsPlugins).toStrictEqual([
      {
        name: '@nestjs/swagger/plugin',
        options: {
          introspectComments: true,
        },
      },
    ]);
  });

  it('should have a Dockerfile', async () => {
    await nestApplicationGenerator(tree, options);

    const config = readProjectConfiguration(tree, options.name);

    expect(tree.exists(`${config.root}/Dockerfile`)).toBe(true);
  });

  it('should increment the port generated for new projects', async () => {
    const names = ['app-1', 'app-2', 'app-3'];

    for (const name of names) {
      await nestApplicationGenerator(tree, { name });
    }

    names.forEach((name, index) => {
      const port = getPortForProject(
        tree,
        readProjectConfiguration(tree, name)
      );

      expect(port).toBe(3333 + index);
    });
  });

  it('should remove globalPrefix', async () => {
    await nestApplicationGenerator(tree, options);

    const mainTsFile = readFileFromSource(tree, options.name, 'main.ts');

    expect(mainTsFile).not.toMatch(/globalPrefix/);
    expect(mainTsFile).toMatch('http://localhost:${port}/swagger');
  });

  describe('--blackboxProject', () => {
    it.each([true, undefined])(
      'should generate a blackbox project when %s',
      async (blackboxProject) => {
        await nestApplicationGenerator(tree, { ...options, blackboxProject });

        const config = readProjectConfiguration(tree, `${options.name}-e2e`);
        expect(config).toBeDefined();
      }
    );

    it('should set up a basic test in the blackbox project', async () => {
      await nestApplicationGenerator(tree, {
        ...options,
        blackboxProject: true,
      });

      const testFile = readFileFromSource(
        tree,
        `${options.name}-e2e`,
        'index.spec.ts'
      );

      expect(testFile).toMatch(/describe\('test'/);
      expect(testFile).toMatch(/fetch\('http:\/\/localhost:3333'/);
      expect(testFile).toMatch(/'Welcome to test!'/);
    });

    it('should not generate a blackbox project when false', async () => {
      await nestApplicationGenerator(tree, {
        ...options,
        blackboxProject: false,
      });

      expect(() =>
        readProjectConfiguration(tree, `${options.name}-e2e`)
      ).toThrow();
    });
  });
});
