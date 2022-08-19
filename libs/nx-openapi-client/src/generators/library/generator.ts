import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  joinPathFragments,
  names,
  Tree,
} from '@nrwl/devkit';
import { libraryGenerator } from '@nrwl/js';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { RunCommandsOptions } from 'nx/src/executors/run-commands/run-commands.impl';
import {
  commonAddFiles,
  updateProjectConfigInTree,
  updatePublishablePackageJson,
} from '@gioragutt/nx-plugin-utils';
import { openapitoolsOpenapiGeneratorCliVersion } from '../../utils/versions';
import { OpenApiLibraryGeneratorSchema } from './schema';
import { GenerateSourcesExecutorSchema } from '../../executors/generate-sources';

function calculateProjectName(options: OpenApiLibraryGeneratorSchema): string {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  return projectName;
}

export async function openApiLibraryGenerator(
  tree: Tree,
  options: OpenApiLibraryGeneratorSchema
) {
  const tasks: GeneratorCallback[] = [];

  tasks.push(
    await libraryGenerator(tree, {
      buildable: true,
      config: 'project',
      ...options,
    })
  );

  const projectName = calculateProjectName(options);

  const projectConfig = updateProjectConfigInTree(
    tree,
    projectName,
    (config) => {
      if (options.publishable) {
        const outputPath = config.targets.build.options.outputPath;

        config.targets.publish = {
          executor: '@nrwl/workspace:run-commands',
          options: {
            command: 'npx -y can-npm-publish --verbose && npm publish',
            cwd: outputPath,
          } as RunCommandsOptions,
          dependsOn: [
            {
              target: 'build',
              projects: 'self',
            },
          ],
        };
      }

      config.targets['generate-sources'] = {
        executor: '@gioragutt/nx-openapi-client:generate-sources',
        outputs: ['{options.outputPath}'],
        options: {
          outputPath: joinPathFragments(config.sourceRoot, 'lib', 'generated'),
          generator: 'typescript-fetch',
          specUrl: options.specUrl,
          additionalProperties: {
            withInterfaces: true,
            supportsES6: true,
            typescriptThreePlus: true,
            useSingleRequestParameter: true,
            enumPropertyNaming: 'original',
          },
          globalProperties: {},
          typeMappings: {},
        } as GenerateSourcesExecutorSchema,
      };
    }
  );

  if (options.publishable) {
    updatePublishablePackageJson(tree, projectConfig.root);
  }

  tasks.push(
    addDependenciesToPackageJson(
      tree,
      {},
      {
        '@openapitools/openapi-generator-cli':
          openapitoolsOpenapiGeneratorCliVersion,
      }
    )
  );

  tree.delete(joinPathFragments(projectConfig.sourceRoot));

  commonAddFiles(tree, joinPathFragments(__dirname, 'files'), {
    projectRoot: projectConfig.root,
  });

  await formatFiles(tree);

  return runTasksInSerial(...tasks);
}

export default openApiLibraryGenerator;
