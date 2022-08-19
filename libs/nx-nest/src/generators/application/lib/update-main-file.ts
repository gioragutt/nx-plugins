import {
  joinPathFragments,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';

import { updateFileInTree } from '@gioragutt/nx-plugin-utils';

const linesToRemove = [
  `const globalPrefix = 'api';`,
  `app.setGlobalPrefix(globalPrefix);`,
];

const replacements = [
  { replace: '${port}/${globalPrefix}', with: '${port}/swagger' },
];

export function updateMainTs(tree: Tree, projectName: string): void {
  const projectConfig = readProjectConfiguration(tree, projectName);

  updateFileInTree(
    tree,
    joinPathFragments(projectConfig.sourceRoot, 'main.ts'),
    (content) => {
      return content
        .split('\n')
        .flatMap((line) => {
          if (linesToRemove.some((l) => line.includes(l))) {
            return [];
          }

          for (const replacement of replacements) {
            line = line.replace(replacement.replace, replacement.with);
          }

          return [line];
        })
        .join('\n');
    }
  );
}
