import {
  joinPathFragments,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { applicationGenerator } from '@nrwl/node';
import { readFileFromRoot } from '@gioragutt/nx-plugin-utils';
import { readDockerComposeYamlInTree } from '../../utils/docker-compose';
import { blackboxProjectGenerator } from './generator';
import { BlackboxProjectGeneratorSchema } from './schema';

const project = 'backend-project';
const blackboxProject = `${project}-e2e`;

describe('blackbox-project generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  async function createProject(
    config: Partial<BlackboxProjectGeneratorSchema> = {}
  ) {
    await applicationGenerator(tree, { name: project });
    await blackboxProjectGenerator(tree, { project, ...config });
  }

  it('should not create an blackbox project when the tested project does not exist', async () => {
    await expect(blackboxProjectGenerator(tree, { project })).rejects.toThrow(
      /cannot find configuration for 'backend-project'/i
    );
  });

  it('should run successfully with default configurations', async () => {
    await createProject();

    const config = readProjectConfiguration(tree, blackboxProject);
    expect(config).toBeDefined();
  });

  it('should create a docker-compose file', async () => {
    await createProject();

    const { root: appRoot } = readProjectConfiguration(tree, project);

    const dockerCompose = readDockerComposeYamlInTree(tree, blackboxProject);

    expect(dockerCompose).toMatchObject({
      services: {
        [project]: {
          build: {
            context: '../../',
            dockerfile: joinPathFragments(appRoot, 'Dockerfile'),
            args: { APP_NAME: project },
          },
        },
      },
    });
  });

  it('should generate correct targets', async () => {
    await createProject();

    const { targets } = readProjectConfiguration(tree, blackboxProject);

    expect(targets.e2e).toBeDefined();
    expect(targets.test).toBeDefined();
    expect(targets.up).toBeDefined();
    expect(targets.down).toBeDefined();
  });

  it('should have an implicit dependency on the tested project', async () => {
    await createProject();

    const { implicitDependencies } = readProjectConfiguration(
      tree,
      blackboxProject
    );

    expect(implicitDependencies).toStrictEqual([project]);
  });

  it('should not have an tsconfig.app.json', async () => {
    await createProject();

    expect(() =>
      readJson(tree, `apps/${blackboxProject}/tsconfig.app.json`)
    ).toThrow();

    expect(
      readJson(tree, `apps/${blackboxProject}/tsconfig.json`).references
    ).toStrictEqual([{ path: './tsconfig.spec.json' }]);
  });

  describe('configurations', () => {
    test('port', async () => {
      const port = 5842;

      await createProject({ port });

      const blackboxEnv = readFileFromRoot(
        tree,
        blackboxProject,
        'blackbox.env'
      );

      expect(blackboxEnv).toMatch(`PORT=${port}`);

      expect(readDockerComposeYamlInTree(tree, blackboxProject)).toMatchObject({
        services: {
          [project]: {
            ports: [`${port}:${port}`],
          },
        },
      });
    });

    test('name', async () => {
      const name = 'my-special-blackbox-project-name';

      await createProject({ name });

      const projectConfig = readProjectConfiguration(tree, name);

      expect(projectConfig.root).toBe(`apps/${name}`);
    });

    test('directory', async () => {
      const directory = 'nested-dir';

      await createProject({ directory });

      const { root: appRoot } = readProjectConfiguration(tree, project);

      const { root: blackboxRoot } = readProjectConfiguration(
        tree,
        `${directory}-${blackboxProject}`
      );

      expect(blackboxRoot).toBe(
        joinPathFragments('apps', directory, blackboxProject)
      );

      expect(
        readDockerComposeYamlInTree(tree, `${directory}-${blackboxProject}`)
      ).toMatchObject({
        services: {
          [project]: {
            build: {
              context: '../../../',
              dockerfile: joinPathFragments(appRoot, 'Dockerfile'),
              args: { APP_NAME: project },
            },
          },
        },
      });
    });
  });
});
