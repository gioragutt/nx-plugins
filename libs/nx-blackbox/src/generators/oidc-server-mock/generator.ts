import { formatFiles, joinPathFragments, Tree } from '@nrwl/devkit';
import { OIDC_SERVER_MOCK_SERVICE_NAME } from '../../utils/constants';
import {
  addDependsOnToService,
  addServiceFromDefinitionFile,
  getServiceOfTestedProject,
  getTestedProjectNameFromService,
  updateDockerComposeYamlInTree,
} from '../../utils/docker-compose';
import { OidcServerMockGeneratorSchema } from './schema';

export async function oidcServerMockGenerator(
  tree: Tree,
  options: OidcServerMockGeneratorSchema
) {
  updateDockerComposeYamlInTree(tree, options.project, (dockerCompose) => {
    const testedProjectService = getServiceOfTestedProject(dockerCompose);

    addDependsOnToService(testedProjectService, OIDC_SERVER_MOCK_SERVICE_NAME);

    const testedProjectName =
      getTestedProjectNameFromService(testedProjectService);

    addServiceFromDefinitionFile(
      dockerCompose,
      OIDC_SERVER_MOCK_SERVICE_NAME,
      joinPathFragments(__dirname, 'assets', 'oidc-server-mock-service.yaml'),
      { serviceName: testedProjectName }
    );
  });

  await formatFiles(tree);
}

export default oidcServerMockGenerator;
