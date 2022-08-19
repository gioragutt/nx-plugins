import {
  formatFiles,
  installPackagesTask,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import { Linter } from '@nrwl/linter';
import { pluginGenerator } from '@nrwl/nx-plugin/src/generators/plugin/plugin';
import { updateJestConfig, updatePackageJson } from '../utils';

export default async function (tree: Tree, { name }: { name: string }) {
  if (!name.startsWith('nx-')) {
    throw new Error(`Plugin names must start with 'nx-'`);
  }

  await pluginGenerator(tree, {
    name,
    compiler: 'tsc',
    linter: Linter.EsLint,
    skipFormat: false,
    skipLintChecks: false,
    skipTsConfig: false,
    unitTestRunner: 'jest',
    importPath: `@gioragutt/${name}`,
    standaloneConfig: true,
    tags: 'type:nx-plugin',
  });

  updatePackageJson(tree, name);
  updateJestConfig(tree, name);
  updateE2EProjectConfig(tree, `${name}-e2e`);

  await formatFiles(tree);

  return () => installPackagesTask(tree);
}

function updateE2EProjectConfig(tree: Tree, name: string) {
  const projectConfig = readProjectConfiguration(tree, name);

  // This replaces the "@nrwl/nx-plugin:e2e" executor with a simple jest one.
  // This is under the assumption that the following is in nx.json
  // {
  //   "targetDependencies": {
  //     "e2e": [
  //       {
  //         "target": "build",
  //         "projects": "dependencies"
  //       }
  //     ]
  //   }
  // }

  const e2eTarget = projectConfig.targets!.e2e;
  e2eTarget.executor = '@nrwl/jest:jest';
  delete e2eTarget.options.target;

  projectConfig.tags?.push('type:nx-plugin-e2e');

  updateProjectConfiguration(tree, name, projectConfig);
}
