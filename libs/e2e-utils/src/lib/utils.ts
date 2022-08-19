import {
  detectPackageManager,
  getPackageManagerCommand,
  joinPathFragments,
  ProjectConfiguration,
  ProjectGraph,
  readJsonFile,
  workspaceRoot,
  writeJsonFile,
} from '@nrwl/devkit';
import {
  cleanup,
  exists,
  patchPackageJsonForPlugin,
  readFile,
  runCommandAsync,
  runPackageManagerInstall,
  tmpProjPath,
  uniq,
  updateFile,
} from '@nrwl/nx-plugin/testing';
import { readCachedProjectGraph } from '@nrwl/workspace/src/core/project-graph';
import { parse as dotenvParse } from 'dotenv';
import { copy, ensureDirSync, existsSync, readFileSync } from 'fs-extra';
import { PackageJson } from 'nx/src/utils/package-json';
import { PackageManagerCommands } from 'nx/src/utils/package-manager';
import {
  killProcess,
  logInfo,
  logWarn,
  runCommandUntil,
  runNxNewCommand,
} from './copied-from-nx';

export const NX_VERSION =
  readJsonFile<PackageJson>(joinPathFragments(workspaceRoot, 'package.json'))
    .dependencies?.['nx'] ?? '';

async function install(command: keyof PackageManagerCommands, value: string) {
  const pmc = getPackageManagerCommand(detectPackageManager(tmpProjPath()));
  return await runCommandAsync(`${pmc[command]} ${value}`);
}

export async function installDependencies(value: string) {
  return await install('add', value);
}

export async function installDevDependencies(value: string) {
  return await install('addDev', value);
}

export async function serveProject(
  projName: string,
  runningIndication: string,
  execute: () => void | Promise<void>
) {
  const p = await runCommandUntil(`serve ${projName}`, (output) => {
    process.stdout.write(output);
    return output.includes(runningIndication);
  });

  try {
    await execute();
  } finally {
    await killProcess(p);
  }
}

function patchE2EForLibrary(importName: string, outputPath: string) {
  patchPackageJsonForPlugin(importName, outputPath);

  // remove dependencies from package.json because we're not yet
  // doing the full setup with a local registry

  const path = joinPathFragments(outputPath, 'package.json');
  const packageJson = readJsonFile(path);
  delete packageJson.dependencies;
  writeJsonFile(path, packageJson);
}

function calculateDependenciesToPatch(
  testedProject: string,
  graph: ProjectGraph
): string[] {
  const output = new Set<string>();

  const dependenciesToCheck: string[] = [testedProject, `${testedProject}-e2e`];

  while (dependenciesToCheck.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dep = dependenciesToCheck.shift()!;

    for (const d of graph.dependencies[dep]) {
      if (!d.target.startsWith('npm:') && !!graph.nodes[d.target]) {
        output.add(d.target);
        dependenciesToCheck.push(d.target);
      }
    }
  }

  return [...output.values()];
}

export function setupE2E(testedProject: string) {
  const projName = uniq(testedProject);
  const graph = readCachedProjectGraph();

  function getProjectConfig(projectName: string) {
    const projectData: ProjectConfiguration = graph.nodes[projectName].data;

    const { name } = readJsonFile<{ name: string }>(
      joinPathFragments(projectData.root, 'package.json')
    );

    return {
      projectName,
      outputPath: projectData.targets?.['build'].options.outputPath,
      importName: name,
    };
  }

  const ownConfig = getProjectConfig(testedProject);

  const dependencies = calculateDependenciesToPatch(testedProject, graph)
    .map(getProjectConfig)
    .filter((d) => d.outputPath && d.importName)
    .filter((d) => !d.importName.startsWith('@nx-plugins/'));

  logInfo(
    `Preparing dependencies to test ${ownConfig.importName}`,
    dependencies
      .map((d) => ` > ${d.importName} (from ${d.outputPath})`)
      .join('\n')
  );

  // this is copied from ensureNxProject, except it allows to add args to `runNxNewCommand`,
  // and it allows to perform any patch we want, instead of just the tested plugin

  ensureDirSync(tmpProjPath());
  cleanup();
  runNxNewCommand('--packageManager=yarn', false);

  const npmrcPath = joinPathFragments(workspaceRoot, '.npmrc');
  if (existsSync(npmrcPath)) {
    copy(npmrcPath, tmpProjPath('.npmrc'));
  } else {
    logWarn(
      'Missing .npmrc file, restricted packages will fail the installation...'
    );
  }

  patchE2EForLibrary(ownConfig.importName, ownConfig.outputPath);

  for (const dep of dependencies) {
    patchE2EForLibrary(dep.importName, dep.outputPath);
  }

  runPackageManagerInstall(false);
  return projName;
}

export function setupDockerfileInNodeApp(projName: string) {
  updateFile(
    `apps/${projName}/Dockerfile`,
    readFileSync(
      joinPathFragments(__dirname, 'assets', 'Dockerfile.node')
    ).toString('utf-8')
  );

  // The ignore on node_modules breaks the absolute path to packaged dist in the tmp proj package.json
  if (exists(tmpProjPath('.dockerignore'))) {
    updateFile('.dockerignore', (content) => {
      if (!content?.includes('node_modules')) {
        return content;
      }

      return content
        .split('\n')
        .filter((l) => !l.includes('node_modules'))
        .join('\n');
    });
  }
}

export function readBlackboxEnv(projName: string): Record<string, string> {
  return dotenvParse(readFile(`apps/${projName}-e2e/blackbox.env`));
}
