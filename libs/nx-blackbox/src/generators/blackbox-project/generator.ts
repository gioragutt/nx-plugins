import {
  formatFiles,
  GeneratorCallback,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { applicationGenerator } from '@nrwl/node';
import {
  commonAddFiles,
  ensureProjectExists,
  updateProjectConfigInTree,
} from '@gioragutt/nx-plugin-utils';
import { BlackboxProjectGeneratorSchema } from './schema';

interface NormalizedSchema extends BlackboxProjectGeneratorSchema {
  name: string;
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(
  tree: Tree,
  options: BlackboxProjectGeneratorSchema
): NormalizedSchema {
  const name = options.name
    ? names(options.name).fileName
    : `${options.project}-e2e`;

  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;

  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    port: options.port ?? null,
    name,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
  };
}

function updateBlackboxProjectConfig(
  tree: Tree,
  normalizedOptions: NormalizedSchema
) {
  return updateProjectConfigInTree(
    tree,
    normalizedOptions.projectName,
    (config) => {
      delete config.targets.build;
      delete config.targets.serve;

      config.implicitDependencies = [normalizedOptions.project];

      Object.assign(config.targets, {
        e2e: {
          executor: '@nrwl/workspace:run-commands',
          options: {
            commands: [
              `nx up ${normalizedOptions.projectName}`,
              `nx test ${normalizedOptions.projectName}`,
              `nx down ${normalizedOptions.projectName}`,
            ],
            parallel: false,
          },
        },
        up: {
          executor: '@nrwl/workspace:run-commands',
          options: {
            command: 'docker-compose build && docker-compose up -d',
            cwd: normalizedOptions.projectRoot,
          },
        },
        down: {
          executor: '@nrwl/workspace:run-commands',
          options: {
            command: 'docker-compose down --remove-orphans',
            cwd: normalizedOptions.projectRoot,
          },
        },
      });
    }
  );
}

function addFiles(
  tree: Tree,
  projectConfig: ProjectConfiguration,
  options: NormalizedSchema
) {
  tree.delete(projectConfig.sourceRoot);
  tree.delete(`${projectConfig.root}/tsconfig.app.json`);

  updateJson(
    tree,
    `${projectConfig.root}/tsconfig.json`,
    (json: { references: { path: string }[] }) => {
      json.references = json.references.filter(
        (r) => !r.path.includes('tsconfig.app.json')
      );
      return json;
    }
  );

  const { root: testedProjectRoot } = readProjectConfiguration(
    tree,
    options.project
  );

  commonAddFiles(tree, joinPathFragments(__dirname, 'files'), {
    ...options,
    testedProjectRoot,
  });
}

export async function blackboxProjectGenerator(
  tree: Tree,
  options: BlackboxProjectGeneratorSchema
): Promise<GeneratorCallback> {
  const normalizedOptions = normalizeOptions(tree, options);

  ensureProjectExists(tree, options.project);

  const installDeps = await applicationGenerator(tree, {
    standaloneConfig: true,
    ...normalizedOptions,
  });

  const projectConfig = updateBlackboxProjectConfig(tree, normalizedOptions);

  addFiles(tree, projectConfig, normalizedOptions);

  await formatFiles(tree);

  return () => installDeps();
}

export default blackboxProjectGenerator;
