import {
  joinPathFragments,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { applicationGenerator } from '@nrwl/node';
import { WIREMOCK_SERVICE_NAME } from '../../utils/constants';
import { readDockerComposeYamlInTree } from '../../utils/docker-compose';
import { wiremockRestClientVersion } from '../../utils/versions';
import { blackboxProjectGenerator } from '../blackbox-project';
import { wiremockGenerator } from './generator';

const project = 'backend-project';
const blackboxProject = `${project}-e2e`;

describe('wiremock generator', () => {
  let tree: Tree;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace();

    await applicationGenerator(tree, { name: project });
    await blackboxProjectGenerator(tree, { project });
    await wiremockGenerator(tree, { project: blackboxProject });
  });

  it('should add service to docker-compose', () => {
    const { services } = readDockerComposeYamlInTree(tree, blackboxProject);

    expect(services[WIREMOCK_SERVICE_NAME]).toBeDefined();
  });

  it('should add service as dependency to tested project', () => {
    const { services } = readDockerComposeYamlInTree(tree, blackboxProject);

    expect(services[project].depends_on).toStrictEqual([WIREMOCK_SERVICE_NAME]);
  });

  it('should not add service to dependencies more than once', async () => {
    await wiremockGenerator(tree, { project: blackboxProject });

    const { services } = readDockerComposeYamlInTree(tree, blackboxProject);

    expect(services[project].depends_on).toStrictEqual([WIREMOCK_SERVICE_NAME]);
  });

  it('should add wiremock-rest-client to devDependencies', () => {
    const { devDependencies } = readJson(tree, 'package.json');
    expect(devDependencies['wiremock-rest-client']).toBe(
      wiremockRestClientVersion
    );
  });

  it('should add src/wiremock.ts', () => {
    const { sourceRoot } = readProjectConfiguration(tree, blackboxProject);
    expect(tree.exists(joinPathFragments(sourceRoot, 'wiremock.ts'))).toBe(
      true
    );
  });
});
