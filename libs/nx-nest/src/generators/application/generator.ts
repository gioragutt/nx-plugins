import {
  formatFiles,
  GeneratorCallback,
  joinPathFragments,
  output,
  Tree,
} from '@nrwl/devkit';
import { applicationGenerator } from '@nrwl/nest';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { openApiLibraryGenerator } from '@gioragutt/nx-openapi-client';
import { appendLinesToFile, commonAddFiles } from '@gioragutt/nx-plugin-utils';
import chalk from 'chalk';
import { initGenerator } from '../init';
import { generateBlackboxProject } from './lib/generate-blackbox-project';
import { normalizeOptions } from './lib/normalize-options';
import { setNextAvailablePortInProject } from './lib/set-next-available-port-in-project';
import { updateMainTs } from './lib/update-main-file';
import { updateProjectConfig } from './lib/update-project-config';
import { ApplicationGeneratorSchema } from './schema';

export async function nestApplicationGenerator(
  tree: Tree,
  options: ApplicationGeneratorSchema
): Promise<GeneratorCallback> {
  const tasks: GeneratorCallback[] = [
    await initGenerator(tree),
    await applicationGenerator(tree, {
      ...options,
      standaloneConfig: true,
    }),
  ];

  const normalizedOptions = normalizeOptions(tree, options);

  updateProjectConfig(tree, normalizedOptions.projectName);

  commonAddFiles(
    tree,
    joinPathFragments(__dirname, 'files', 'app'),
    normalizedOptions
  );

  appendLinesToFile(tree, '.dockerignore', ['node_modules']);
  appendLinesToFile(tree, '.gitignore', ['.npmrc', '.env']);

  const port = setNextAvailablePortInProject(
    tree,
    normalizedOptions.projectName
  );

  updateMainTs(tree, normalizedOptions.projectName);

  if (normalizedOptions.blackboxProject) {
    tasks.push(await generateBlackboxProject(tree, normalizedOptions, port));
  }
  if (normalizedOptions.openapiClientLibrary) {
    const clientLibName = `${normalizedOptions.projectName}-client`;

    tasks.push(
      await openApiLibraryGenerator(tree, {
        name: clientLibName,
        specUrl: `http://localhost:${port}/swagger-json`,
        publishable: true,
        importPath: `@gioragutt/${clientLibName}`,
        tags: `type:openapi-client`,
      })
    );
  }

  await formatFiles(tree);

  return runTasksInSerial(...tasks, () =>
    output.log({
      title: `You should run ${chalk.bold.blue.bgWhite.inverse(
        ' cp ~/.npmrc . '
      )}`,
      bodyLines: [
        'Until docker-compose supports mounting secret files, copying over an .npmrc file is required to install private dependencies.',
        '',
        'To enable running e2e tests (which build an image of your service), you should copy over an .npmrc file using the command above.',
      ],
    })
  );
}

export default nestApplicationGenerator;
