import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import {
  Tree,
  readProjectConfiguration,
  joinPathFragments,
  readJson,
} from '@nrwl/devkit';

import generator from './generator';
import { OpenApiLibraryGeneratorSchema } from './schema';
import { readFileFromSource } from '@gioragutt/nx-plugin-utils';
import { openapitoolsOpenapiGeneratorCliVersion } from '../../utils/versions';

describe('library generator', () => {
  let tree: Tree;

  const options: OpenApiLibraryGeneratorSchema = {
    name: 'test',
    specUrl: 'http://localhost:3333/swagger-json',
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generator(tree, options);

    const config = readProjectConfiguration(tree, options.name);
    expect(config).toBeDefined();
  });

  it('should update dependencies in package.json', async () => {
    await generator(tree, options);

    expect(readJson(tree, 'package.json')).toMatchObject({
      devDependencies: {
        '@openapitools/openapi-generator-cli':
          openapitoolsOpenapiGeneratorCliVersion,
      },
    });
  });

  it('should configure package.json as publishable', async () => {
    await generator(tree, {
      ...options,
      publishable: true,
      importPath: `@gioragutt/${options.name}`,
    });

    const config = readProjectConfiguration(tree, options.name);

    expect(
      readJson(tree, joinPathFragments(config.root, 'package.json'))
    ).toMatchObject({
      name: `@gioragutt/${options.name}`,
      publishConfig: {
        access: 'restricted',
        registry: 'https://npm.pkg.github.com',
      },
      repository: {
        type: 'git',
        directory: config.root,
      },
    });
  });

  it('should have a lib/generated/index.ts file', async () => {
    await generator(tree, options);

    expect(
      readFileFromSource(tree, options.name, 'lib', 'generated', 'index.ts')
    ).toBeDefined();
  });

  it('should have a generate-sources target', async () => {
    await generator(tree, options);

    const config = readProjectConfiguration(tree, options.name);

    expect(config.targets).toMatchObject({
      ['generate-sources']: {
        executor: '@gioragutt/nx-openapi-client:generate-sources',
        options: {
          outputPath: joinPathFragments(config.sourceRoot, 'lib', 'generated'),
          generator: 'typescript-fetch',
          specUrl: 'http://localhost:3333/swagger-json',
        },
      },
    });
  });

  it('should not have a publish target when not publishable', async () => {
    await generator(tree, options);

    const config = readProjectConfiguration(tree, options.name);

    expect(config.targets).not.toHaveProperty('publish');
  });

  it('should have a publish target when publishable', async () => {
    await generator(tree, {
      ...options,
      publishable: true,
      importPath: `@gioragutt/${options.name}`,
    });

    const config = readProjectConfiguration(tree, options.name);

    expect(config.targets).toMatchObject({
      publish: {
        executor: '@nrwl/workspace:run-commands',
        options: {
          command: 'npx -y can-npm-publish --verbose && npm publish',
          cwd: config.targets.build.options.outputPath,
        },
        dependsOn: [
          {
            target: 'build',
            projects: 'self',
          },
        ],
      },
    });
  });
});
