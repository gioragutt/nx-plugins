// @ts-check

const { readJsonFile, writeJsonFile } = require('@nrwl/devkit');
const { execSync } = require('child_process');
const { readdirSync } = require('fs-extra');
const path = require('path');

const exec = (/** @type {string }*/ command) => {
  console.log('>', command);
  return execSync(command, { stdio: [0, 1, 2] });
};

const libsBuildOutput = path.resolve('dist/libs');
const publishingOutput = path.resolve('dist/npm');
const registry = execSync('npm config get registry').toString('utf-8').trim();

/**
 *
 * @param {string} localPluginsVersion
 * @param {boolean} local
 */
function packageLibraries(localPluginsVersion, local) {
  if (localPluginsVersion === '--local') {
    localPluginsVersion = '*';
  }

  exec('rm -rf dist');
  exec('yarn nx run-many --target=build --all --parallel');
  exec(`rm -rf ${publishingOutput} && mkdir -p ${publishingOutput}`);

  const { devDependencies } = readJsonFile('package.json');

  for (const lib of readdirSync(libsBuildOutput)) {
    processBuiltLibrary(
      lib,
      localPluginsVersion,
      devDependencies['@nrwl/workspace'],
      devDependencies,
      local
    );
  }
}

module.exports = packageLibraries;

/**
 *
 * @param {string} lib
 * @param {string} localPluginsVersion
 * @param {string} nxVersion
 * @param {Record<string, string>} devDependencies
 * @param {boolean} local
 * @returns
 */
function processBuiltLibrary(
  lib,
  localPluginsVersion,
  nxVersion,
  devDependencies,
  local
) {
  const packageJsonPath = path.join(libsBuildOutput, lib, 'package.json');
  const packageJson = readJsonFile(packageJsonPath);

  if (packageJson.name.startsWith('@nx-plugins')) {
    console.info(`Library ${packageJson.name} is not publishable, skipping...`);
    return;
  }

  packageJson.version = localPluginsVersion;

  const deps = packageJson.dependencies ?? {};

  for (const [name, version] of Object.entries(deps)) {
    if (version !== '*') {
      continue;
    }

    if (name.startsWith('@nrwl')) {
      deps[name] = nxVersion;
    } else if (name.startsWith('@gioragutt')) {
      if (localPluginsVersion === '*') {
        const libName = name.split('/')[1];
        deps[name] = `file:${libsBuildOutput}/${libName}`;
      } else {
        deps[name] = localPluginsVersion;
      }
    } else {
      const depVersion = devDependencies[name];
      if (!depVersion) {
        throw new Error(
          `Cannot find version for '${name}' dependency of ${lib} in the root package.json`
        );
      }
      deps[name] = depVersion;
    }
  }

  if (local) {
    // Needed because otherwise it will only publish to github registry
    packageJson.publishConfig.registry = registry;
  }

  writeJsonFile(packageJsonPath, packageJson);
  exec(`cp -R ${libsBuildOutput}/${lib} ${publishingOutput}`);
}

if (require.main === module) {
  const [version, local] = process.argv.slice(2);
  if (!version) {
    console.error('No version passed to package.js');
    process.exit(1);
  }

  packageLibraries(version, local !== 'false');
}
