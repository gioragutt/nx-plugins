/*
 * This script checks if new versions of node modules are available.
 * It uses naming conventions to transform constants to matching node module name.
 *
 * Usage:
 *   yarn check-versions [file|package]
 *
 * Positional arg:
 *   - [file]: relative or absolute file path to the versions file.
 *
 * Example:
 *   yarn check-versions react
 */

import { dasherize } from '@nrwl/workspace/src/utils/strings';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { readJsonSync } from 'fs-extra';
import * as glob from 'glob';
import { join, relative } from 'path';
import { gt } from 'semver';

const root = join(__dirname, '..');
const excluded = ['nxVersion'];
const scoped = [
  'babel',
  'emotion',
  'reduxjs',
  'swc',
  'testing-library',
  'types',
  'nestjs',
  'openapitools',
  'gioragutt',
];

try {
  const files = process.argv[2]
    ? [normalize(process.argv[2])]
    : glob.sync('libs/**/*/versions.ts').map((x) => relative(root, x));
  checkFiles(files);
} catch (e) {
  console.log(chalk.red(e.message));
  process.exitCode = 1;
}

function normalize(x: string) {
  if (x.endsWith('.ts')) {
    return x;
  } else {
    return join('libs', x, 'src/utils/versions.ts');
  }
}

// -----------------------------------------------------------------------------

function checkFiles(files: string[]) {
  console.log(chalk.blue(`Checking versions in the following files...\n`));
  console.log(`  - ${files.join('\n  - ')}\n`);
  const maxFileNameLength = Math.max(...files.map((f) => f.length));

  let hasError = false;

  files.forEach((f) => {
    const projectRoot = f.split('/src/')[0];
    const migrationsPath = join(projectRoot, 'migrations.json');
    const migrationsJson = readJsonSync(migrationsPath, { throws: false }) ?? {
      packageJsonUpdates: {},
    };
    let versionsContent = readFileSync(f).toString();
    const versions = getVersions(f);
    const npmPackages = getPackages(versions);
    const results = npmPackages.map(getVersionData);
    const logContext = `${f.padEnd(maxFileNameLength)}`;
    const packageUpdates = {};

    results.forEach((r) => {
      if (r.outdated) {
        console.log(
          `${logContext} ❗ ${chalk.bold(
            r.package
          )} has new version ${chalk.bold(r.latest)} (current: ${r.prev})`
        );
        versionsContent = versionsContent.replace(
          `${r.variable} = '${r.prev}'`,
          `${r.variable} = '${r.latest}'`
        );
        packageUpdates[r.package] = {
          version: r.latest,
          alwaysAddToPackageJson: false,
        };
      }
      if (r.invalid) {
        hasError = true;
        console.log(
          `${logContext} ⚠️ ${chalk.bold(r.package)} has an invalid version (${
            r.prev
          }) specified. Latest is ${r.latest}.`
        );
      }
    });

    // TODO: figure out how these migration things work in NX itself
    // if (Object.keys(packageUpdates).length > 0) {
    //   migrationsJson.packageJsonUpdates['x.y.z'] = {
    //     version: 'x.y.z',
    //     packages: packageUpdates,
    //   };
    //   writeFileSync(f, versionsContent);
    //   writeJsonSync(migrationsPath, migrationsJson, { spaces: 2 });
    // }
  });

  if (hasError) {
    throw new Error('Invalid versions of packages found (please see above).');
  }
}

function getVersions(path: string) {
  const versionsPath =
    path.startsWith('.') || path.startsWith('libs')
      ? join(__dirname, '..', path)
      : path;
  try {
    return require(versionsPath);
  } catch {
    throw new Error(`Could not load ${path}. Please make sure it is valid.`);
  }
}

interface PackageInfo {
  pkg: string;
  version: string;
  variable: string;
}

function getPackages(versions: Record<string, string>) {
  return Object.entries(versions).reduce((acc, [variable, version]) => {
    if (!excluded.includes(variable)) {
      const pkg = getNpmName(variable);
      acc.push({ pkg, version, variable });
    }
    return acc;
  }, [] as PackageInfo[]);
}

function getNpmName(name: string): string {
  const dashedName = dasherize(name.replace(/Version$/, ''));
  const scope = scoped.find((s) => dashedName.startsWith(`${s}-`));

  if (scope) {
    const rest = dashedName.split(`${scope}-`)[1];
    return `@${scope}/${rest}`;
  } else {
    return dashedName;
  }
}

function getVersionData({ pkg, variable, version }: PackageInfo): {
  variable: string;
  package: string;
  outdated: boolean;
  invalid: boolean;
  latest: string;
  prev?: string;
} {
  try {
    const latest = JSON.parse(
      execSync(`npm view ${pkg} version --json --silent`, {
        stdio: ['ignore'],
      }).toString('utf-8')
    );

    if (gt(latest, version)) {
      return {
        variable,
        package: pkg,
        outdated: true,
        invalid: false,
        latest,
        prev: version,
      };
    }
    if (gt(version, latest)) {
      return {
        variable: variable,
        package: pkg,
        outdated: false,
        invalid: true,
        latest,
        prev: version,
      };
    }
  } catch (e) {
    console.log('Error parsing versions', pkg, version, variable, e);
    // ignored
  }
  return {
    variable,
    package: pkg,
    outdated: false,
    invalid: false,
    latest: version,
  };
}
