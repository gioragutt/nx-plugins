import { Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { applicationGenerator } from '@nrwl/node';
import { OIDC_SERVER_MOCK_SERVICE_NAME } from '../../utils/constants';
import { readDockerComposeYamlInTree } from '../../utils/docker-compose';
import { blackboxProjectGenerator } from '../blackbox-project';
import { oidcServerMockGenerator } from './generator';

const project = 'backend-project';
const blackboxProject = `${project}-e2e`;

describe('oidc-server-mock generator', () => {
  let tree: Tree;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace();

    await applicationGenerator(tree, { name: project });
    await blackboxProjectGenerator(tree, { project });
    await oidcServerMockGenerator(tree, { project: blackboxProject });
  });

  it('should add service to docker-compose', async () => {
    const { services } = readDockerComposeYamlInTree(tree, blackboxProject);

    expect(services[OIDC_SERVER_MOCK_SERVICE_NAME]).toBeDefined();
  });

  it('should add service as dependency to tested project', async () => {
    const { services } = readDockerComposeYamlInTree(tree, blackboxProject);

    expect(services[project].depends_on).toStrictEqual([
      OIDC_SERVER_MOCK_SERVICE_NAME,
    ]);
  });

  it('should not add service to dependencies more than once', async () => {
    await oidcServerMockGenerator(tree, { project: blackboxProject });

    const { services } = readDockerComposeYamlInTree(tree, blackboxProject);

    expect(services[project].depends_on).toStrictEqual([
      OIDC_SERVER_MOCK_SERVICE_NAME,
    ]);
  });
});
