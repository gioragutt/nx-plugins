export interface GenerateSourcesExecutorSchema {
  outputPath: string;
  generator: string;
  specUrl: string;
  additionalProperties?: Record<string, unknown>;
  globalProperties?: Record<string, unknown>;
  typeMappings?: Record<string, unknown>;
}
