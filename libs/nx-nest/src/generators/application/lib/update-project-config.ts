import { Tree } from '@nrwl/devkit';
import { updateProjectConfigInTree } from '@gioragutt/nx-plugin-utils';

export function updateProjectConfig(tree: Tree, projectName: string) {
  updateProjectConfigInTree(tree, projectName, (projectConfig) => {
    projectConfig.tags ??= [];
    projectConfig.tags.push('type:service');

    const buildTarget = projectConfig.targets.build;

    buildTarget.options.generatePackageJson = true;
    buildTarget.options.tsPlugins = [
      {
        name: '@nestjs/swagger/plugin',
        options: {
          introspectComments: true,
        },
      },
    ];
  });
}
