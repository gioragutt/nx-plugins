import {
  ExecutorContext,
  getPackageManagerCommand,
  logger,
} from '@nrwl/devkit';
import { execSync } from 'child_process';
import { parseProperties } from '../../utils/cli-helpers';
import { GenerateSourcesExecutorSchema } from './schema';

const propertiesArg = (
  key: string,
  properties: Record<string, unknown> | undefined
): Record<string, string> => {
  if (!properties) {
    return {};
  }
  return { [key]: parseProperties(properties) };
};

export async function generateSourcesExecutor(
  {
    generator,
    outputPath,
    specUrl,
    additionalProperties,
    typeMappings,
    globalProperties,
  }: GenerateSourcesExecutorSchema,
  { projectName }: ExecutorContext
): Promise<{ success: boolean }> {
  const flags = {
    '-i': specUrl,
    '-g': generator,
    '-o': outputPath,
    ...propertiesArg('--additional-properties', additionalProperties),
    ...propertiesArg('--type-mappings', typeMappings),
    ...propertiesArg('--global-property', globalProperties),
  };

  const args = ['generate', ...Object.entries(flags).flat()];
  logger.debug('Running openapi-generator-api with', args);

  try {
    const pmc = getPackageManagerCommand();

    execSync(pmc.run('-s openapi-generator-cli', args.join(' ')), {
      stdio: 'inherit',
    });

    execSync(pmc.run('-s nx', `format:write --projects ${projectName}`), {
      stdio: 'inherit',
    });

    return { success: true };
  } catch (e) {
    logger.error('Error generating sources');
    logger.error(e);

    return { success: false };
  }
}

export default generateSourcesExecutor;
