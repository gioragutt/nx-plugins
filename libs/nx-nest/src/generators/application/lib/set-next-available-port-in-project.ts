import {
  getProjects,
  joinPathFragments,
  ProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import {
  readFileFromSource,
  updateFileInTree,
} from '@gioragutt/nx-plugin-utils';

const PORT_SOURCE_REGEX = /const port = process.env.PORT \|\| (\d+);/;

export const getPortForProject = (
  tree: Tree,
  projectConfig: ProjectConfiguration
) => {
  const mainTsFile = readFileFromSource(tree, projectConfig, 'main.ts');
  const portString = mainTsFile?.match(PORT_SOURCE_REGEX)?.[1];
  return portString ? Number(portString) : undefined;
};

export function setNextAvailablePortInProject(
  tree: Tree,
  projectName: string
): number {
  const projects = getProjects(tree);

  const usedPorts = [...projects.keys()]
    .filter((k) => k !== projectName && !k.endsWith('-e2e'))
    .map((k) => projects.get(k))
    .filter((p) => p.projectType === 'application')
    .map((project) => getPortForProject(tree, project))
    .filter((p) => !!p);

  const newAppConfig = projects.get(projectName);
  const portInNewApp = getPortForProject(tree, newAppConfig);

  if (!usedPorts.includes(portInNewApp)) {
    return portInNewApp;
  }

  const newPort = Math.max(...usedPorts) + 1;

  updateFileInTree(
    tree,
    joinPathFragments(newAppConfig.sourceRoot, 'main.ts'),
    (content) =>
      content.replace(PORT_SOURCE_REGEX, (currentStatement, port) =>
        currentStatement.replace(port, `${newPort}`)
      )
  );

  return newPort;
}
