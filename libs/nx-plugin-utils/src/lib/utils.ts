import {
  generateFiles,
  joinPathFragments,
  logger,
  names,
  offsetFromRoot,
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
  updateJson,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import { execSync } from 'child_process';
import { dump, DumpOptions, load, LoadOptions } from 'js-yaml';

export function updateFileInTree(
  tree: Tree,
  path: string,
  updater: (content: string | null) => string
): void {
  const before = tree.read(path, 'utf-8');
  const after = updater(before);
  tree.write(path, after);
}

export interface CommonNormalizedSchema {
  name?: string;
  projectRoot: string;
}

export function commonAddFiles<S extends CommonNormalizedSchema>(
  tree: Tree,
  filesPath: string,
  options: S
) {
  const templateOptions = {
    ...options,
    ...(options.name ? names(options.name) : {}),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    // tmpl is used as a marker to make sure .ts files don't end with .ts,
    // since those files can then be picked up by things like tsc, and we don't want that
    tmpl: '',
  };

  generateFiles(tree, filesPath, options.projectRoot, templateOptions);
}

export function updateProjectConfigInTree(
  tree: Tree,
  projectName: string,
  updater: (config: ProjectConfiguration) => ProjectConfiguration | void
): ProjectConfiguration {
  const projectConfig = readProjectConfiguration(tree, projectName);
  const result = updater(projectConfig);

  const updated =
    result === undefined ? projectConfig : (result as ProjectConfiguration);

  updateProjectConfiguration(tree, projectName, updated);

  return updated;
}

export function readFileFromRoot(
  tree: Tree,
  project: string | ProjectConfiguration,
  firstPart: string,
  ...pathParts: string[]
): string | null {
  const { root } =
    typeof project === 'string'
      ? readProjectConfiguration(tree, project)
      : project;

  return tree.read(joinPathFragments(root, firstPart, ...pathParts), 'utf-8');
}

export function readFileFromSource(
  tree: Tree,
  project: string | ProjectConfiguration,
  firstPart: string,
  ...pathParts: string[]
): string | null {
  const { root, sourceRoot } =
    typeof project === 'string'
      ? readProjectConfiguration(tree, project)
      : project;

  if (!sourceRoot) {
    throw new Error(`Project in '${root}' has no source root`);
  }

  return tree.read(
    joinPathFragments(sourceRoot, firstPart, ...pathParts),
    'utf-8'
  );
}

export function ensureProjectExists(tree: Tree, projectName: string): void {
  readProjectConfiguration(tree, projectName);
}

/**
 * Reads a yaml file, removes all comments and parses YAML.
 *
 * @param tree - file system tree
 * @param path - file path
 * @param options - yaml loading options
 */
export function readYaml<T = any>(
  tree: Tree,
  path: string,
  options?: LoadOptions
): T {
  const content = tree.read(path, 'utf-8');
  if (!content) {
    throw new Error(`Cannot find ${path}`);
  }

  try {
    return load(content, { filename: path, ...options }) as T;
  } catch (e) {
    throw new Error(`Cannot parse ${path}: ${e.message}`);
  }
}

/**
 * Writes a YAML value to the file system tree
 * @param tree File system tree
 * @param path Path of YAML file in the Tree
 * @param value Serializable value to write
 * @param options Optional YAML Serialize Options
 */
export function writeYaml<T = any>(
  tree: Tree,
  path: string,
  value: T,
  options?: DumpOptions
): void {
  tree.write(path, dump(value, options));
}

/**
 * Updates a YAML value to the file system tree
 *
 * @param tree File system tree
 * @param path Path of YAML file in the Tree
 * @param updater Function that maps the current value of a YAML document to a new value to be written to the document
 * @param options Optional YAML Parse and Serialize Options
 */
export function updateYaml<T = any, U = T>(
  tree: Tree,
  path: string,
  updater: U | ((value: T) => U | void),
  options?: LoadOptions & DumpOptions
): void {
  const yaml = readYaml(tree, path, options);
  let updated = updater instanceof Function ? updater(yaml) : updater;
  if (updated === undefined) {
    updated = yaml;
  }
  writeYaml(tree, path, updated, options);
}

export function formatGitRemoteUrl(
  getRemote: () => string
): string | undefined {
  try {
    const gitRepoPrefix = 'git+https://github.com/';
    const formattedRemote = getRemote()
      .replace('https://github.com/', gitRepoPrefix)
      .replace('git@github.com:', gitRepoPrefix)
      .toLowerCase()
      .trim();

    if (!formattedRemote) {
      return undefined;
    }

    if (formattedRemote.endsWith('.git')) {
      return formattedRemote;
    }

    return `${formattedRemote}.git`;
  } catch {
    // already logged after
    return undefined;
  }
}

export function updatePublishablePackageJson(
  tree: Tree,
  projectRoot: string,
  {
    getRemote = () =>
      execSync('git config --get remote.origin.url', { encoding: 'utf-8' }),
  }: { getRemote?: () => string } = {}
) {
  const gitUrl = formatGitRemoteUrl(getRemote);

  if (!gitUrl) {
    logger.warn('Failed to find git remote, please fill it in later');
  }

  updateJson(tree, joinPathFragments(projectRoot, 'package.json'), (json) =>
    Object.assign(json, {
      repository: {
        type: 'git',
        url: gitUrl,
        directory: projectRoot,
      },
      publishConfig: {
        access: 'public',
        registry: 'https://registry.npmjs.org/',
      },
    })
  );
}

export function appendLinesToFile(
  tree: Tree,
  path: string,
  linesToAppend: string[]
) {
  updateFileInTree(tree, path, (content) => {
    if (!content) {
      return linesToAppend.join('\n');
    }

    const linesInFile = content.split('\n');
    const endsWithNewLine = linesInFile.at(-1) === '';
    if (endsWithNewLine) {
      linesInFile.pop();
      if (linesToAppend.at(-1) === '') {
        linesToAppend.pop();
      }
    }

    linesToAppend = [...linesToAppend];

    for (const line of linesInFile) {
      const index = linesToAppend.indexOf(line);
      if (index >= 0) {
        linesToAppend.splice(index, 1);
      }
    }

    if (endsWithNewLine) {
      linesToAppend.push('');
    }

    return [...linesInFile, ...linesToAppend].join('\n');
  });
}
