import { Tree, updateJson } from '@nrwl/devkit';

export function updatePackageJson(tree: Tree, name: string) {
  updateJson(tree, `libs/${name}/package.json`, (json) =>
    Object.assign(json, {
      repository: {
        type: 'git',
        url: 'git+https://github.com/gioragutt/nx-plugins.git',
        directory: `libs/${name}`,
      },
      publishConfig: {
        access: 'restricted',
        registry: 'https://npm.pkg.github.com',
      },
    })
  );
}

export function updateJestConfig(tree: Tree, name: string) {
  const path = `libs/${name}/jest.config.ts`;

  const jestConfig = tree.read(path, 'utf-8');

  const updatedConfig = jestConfig.replace(
    /moduleFileExtensions: \[(.*)\]/,
    (fullMatch, currentExtensions) =>
      fullMatch.replace(currentExtensions, `${currentExtensions}, 'd.ts'`)
  );

  tree.write(path, updatedConfig);
}
