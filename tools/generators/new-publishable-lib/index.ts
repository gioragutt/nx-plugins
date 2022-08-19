import { formatFiles, installPackagesTask, Tree } from '@nrwl/devkit';
import { libraryGenerator } from '@nrwl/js';
import { updateJestConfig, updatePackageJson } from '../utils';

export default async function (tree: Tree, { name }: { name: string }) {
  if (!name.startsWith('nx-')) {
    throw new Error(`Library names names must start with 'nx-'`);
  }

  await libraryGenerator(tree, {
    name,
    importPath: `@gioragutt/${name}`,
    buildable: true,
    publishable: true,
    config: 'project',
  });

  updatePackageJson(tree, name);
  updateJestConfig(tree, name);

  await formatFiles(tree);

  return () => installPackagesTask(tree);
}
