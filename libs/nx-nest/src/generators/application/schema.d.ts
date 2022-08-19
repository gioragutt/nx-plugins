import { ApplicationGeneratorOptions as NestApplicationGeneratorOptions } from '@nrwl/nest/src/generators/application/schema';

export interface ApplicationGeneratorSchema
  extends Omit<
    NestApplicationGeneratorOptions,
    | 'skipFormat'
    | 'skipPackageJson'
    | 'linter'
    | 'unitTestRunner'
    | 'standaloneConfig'
  > {
  blackboxProject?: boolean;
  openapiClientLibrary?: boolean;
}
