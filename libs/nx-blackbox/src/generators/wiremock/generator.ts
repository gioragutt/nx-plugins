import {
  addDependenciesToPackageJson,
  formatFiles,
  joinPathFragments,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { commonAddFiles } from '@gioragutt/nx-plugin-utils';
import { WIREMOCK_SERVICE_NAME } from '../../utils/constants';
import {
  addDependsOnToService,
  addServiceFromDefinitionFile,
  getServiceOfTestedProject,
  updateDockerComposeYamlInTree,
} from '../../utils/docker-compose';
import { wiremockRestClientVersion } from '../../utils/versions';
import { WiremockGeneratorSchema } from './schema';

export async function wiremockGenerator(
  tree: Tree,
  options: WiremockGeneratorSchema
) {
  updateDockerComposeYamlInTree(tree, options.project, (dockerCompose) => {
    addDependsOnToService(
      getServiceOfTestedProject(dockerCompose),
      WIREMOCK_SERVICE_NAME
    );

    addServiceFromDefinitionFile(
      dockerCompose,
      WIREMOCK_SERVICE_NAME,
      joinPathFragments(__dirname, 'assets', 'wiremock-service.yaml'),
      {}
    );
  });

  const projectConfig = readProjectConfiguration(tree, options.project);

  const installDeps = addDependenciesToPackageJson(
    tree,
    {},
    { 'wiremock-rest-client': wiremockRestClientVersion }
  );

  commonAddFiles(tree, joinPathFragments(__dirname, 'files'), {
    projectRoot: projectConfig.root,
  });

  await formatFiles(tree);

  return () => installDeps();
}

export default wiremockGenerator;
