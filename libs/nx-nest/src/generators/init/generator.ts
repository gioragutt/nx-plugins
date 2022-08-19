import { addDependenciesToPackageJson, formatFiles, Tree } from '@nrwl/devkit';
import {
  classTransformerVersion,
  classValidatorVersion,
  // golevelupNestjsDiscoveryVersion,
  nestjsSwaggerVersion,
  nestjsTerminusVersion,
  nodeFetchVersion,
  typesNodeFetchVersion,
} from '../../utils/versions';

export async function initGenerator(tree: Tree) {
  const installTask = addDependenciesToPackageJson(
    tree,
    {
      // peer deps of nestjs-utilities
      '@nestjs/swagger': nestjsSwaggerVersion,
      'node-fetch': nodeFetchVersion,
      'class-validator': classValidatorVersion,
      'class-transformer': classTransformerVersion,

      // peer deps of nestjs-health
      '@nestjs/terminus': nestjsTerminusVersion,
      // '@golevelup/nestjs-discovery': golevelupNestjsDiscoveryVersion,
    },
    {
      '@types/node-fetch': typesNodeFetchVersion,
    }
  );

  await formatFiles(tree);

  return () => installTask();
}
