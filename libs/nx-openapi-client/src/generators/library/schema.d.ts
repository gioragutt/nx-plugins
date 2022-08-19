import { LibraryGeneratorSchema } from '@nrwl/js/src/utils/schema';

export type OpenApiLibraryGeneratorSchema = Pick<
  LibraryGeneratorSchema,
  'name' | 'directory' | 'tags' | 'importPath' | 'publishable'
> & {
  specUrl: string;
};
