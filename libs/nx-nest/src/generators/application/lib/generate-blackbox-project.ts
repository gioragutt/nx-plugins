import {
  GeneratorCallback,
  joinPathFragments,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import {
  blackboxProjectGenerator,
  BlackboxProjectGeneratorSchema,
} from '@gioragutt/nx-blackbox';
import { commonAddFiles } from '@gioragutt/nx-plugin-utils';
import { NormalizedSchema } from './normalize-options';

export async function generateBlackboxProject(
  tree: Tree,
  normalizedOptions: NormalizedSchema,
  port: number
): Promise<GeneratorCallback> {
  const blackboxSchema: BlackboxProjectGeneratorSchema = {
    project: normalizedOptions.projectName,
    port,
  };

  const task = await blackboxProjectGenerator(tree, blackboxSchema);

  const projectRoot = readProjectConfiguration(
    tree,
    `${normalizedOptions.projectName}-e2e`
  ).root;

  commonAddFiles(tree, joinPathFragments(__dirname, '..', 'files', 'e2e'), {
    ...blackboxSchema,
    projectRoot,
  });

  return task;
}
