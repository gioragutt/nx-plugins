import { readFileSync } from 'fs';
import { load, LoadOptions } from 'js-yaml';
import * as ejs from 'ejs';
import {
  joinPathFragments,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { readYaml, updateYaml } from '@gioragutt/nx-plugin-utils';
import {
  ComposeSpecification,
  DefinitionsService,
  ListOfStrings,
} from './docker-compose-yaml-types';

export function getTestedProjectNameFromService(
  service: DefinitionsService
): string | undefined {
  return service.build?.args?.APP_NAME as string;
}

export function getServiceOfTestedProject(dockerCompose: ComposeSpecification) {
  return Object.values(dockerCompose.services).find(
    (service) => !!getTestedProjectNameFromService(service)
  );
}

export function addDependsOnToService(
  service: DefinitionsService,
  dependencyName: string
): void {
  const dependsOn = (service.depends_on ||= []) as ListOfStrings;

  if (!dependsOn.includes(dependencyName)) {
    dependsOn.push(dependencyName);
  }
}

export function addService(
  dockerCompose: ComposeSpecification,
  serviceName: string,
  definition: DefinitionsService
): void {
  if (!dockerCompose.services[serviceName]) {
    dockerCompose.services[serviceName] = definition;
  }
}

export function addServiceFromDefinitionFile(
  dockerCompose: ComposeSpecification,
  serviceName: string,
  definitionFilePath: string,
  templateVariables: object,
  loadOptions?: LoadOptions
): void {
  const definitionFileTemplate = readFileSync(definitionFilePath, 'utf-8');
  const renderedDefinitionFile = ejs.render(
    definitionFileTemplate,
    templateVariables
  );
  const definition = load(
    renderedDefinitionFile,
    loadOptions
  ) as DefinitionsService;
  addService(dockerCompose, serviceName, definition);
}

export function getDockerComposeFilePath(
  tree: Tree,
  projectRoot: string
): string {
  const files = ['docker-compose.yaml', 'docker-compose.yml'];

  const fileName = files.find((f) =>
    tree.exists(joinPathFragments(projectRoot, f))
  );

  if (!fileName) {
    throw new Error(
      `Failed to find docker-compose file in '${projectRoot}'. Tried ${files.join(
        ', '
      )}.`
    );
  }

  return joinPathFragments(projectRoot, fileName);
}

export function updateDockerComposeYamlInTree(
  tree: Tree,
  projectName: string,
  updater: (dockerCompose: ComposeSpecification) => void
) {
  const projectConfig = readProjectConfiguration(tree, projectName);
  const path = getDockerComposeFilePath(tree, projectConfig.root);
  updateYaml(tree, path, updater);
}

export function readDockerComposeYamlInTree(tree: Tree, projectName: string) {
  const { root } = readProjectConfiguration(tree, projectName);
  const path = getDockerComposeFilePath(tree, root);
  return readYaml<ComposeSpecification>(tree, path);
}
