# Intro

This file documents all the scripts and other things in code done in the process of releasing.

This repo uses a single-version policy, much like NX itself, and all the publishing scripts are copied from the NX repo itself and modified.

As such, the [CONTRIBUTING guide](https://github.com/nrwl/nx/blob/master/CONTRIBUTING.md) of NX itself largely applies to this repo as well.

# Releasing locally

Follow the video in the contributing guide above.

# Releasing production

Ensure you're npm-logged in to `@gioragutt` with a write-access PAT.

`GITHUB_TOKEN_RELEASE_IT_NX=<GitHub PAT> yarn nx-release <version>`

# Scripts

## tools/depcheck/index.ts

The `depcheck` script (run via `yarn depcheck`) helps us ensure that library dependencies are correctly specified in their `package.json` files.
Dependencies are analyzed using static code analysis (AST), and alerts whether packages are missing, or have invalid versions (semver wise, compared to root package.json devDependencies), in the library `package.json`s.

> packages which we want to exclude from a `package.json` (f.e because they are provided by one of the dependencies) are to be added to `tools/depcheck/missing.ts`.

> packages which we want to specify unfitting versions for in a `package.json` are to be added to `tools/depcheck/discrepancies.ts`

## tools/nx-release.js

The `nx-release.js` script (run via `yarn nx-release`) is the orchestrator script for releasing a new version of the nx plugins suite of libraries in this repo.

It's syntax is `yarn nx-release <version> [--local] [--dry-run]`:

- version is in the form of `x.y.z` (release) or `x.y.z-(alpha|beta|rc).w` (prerelease)
- `--local` is used when publishing locally (see [nrwl/nx#CONTRIBUTING.md](https://github.com/nrwl/nx/blob/master/CONTRIBUTING.md) for tutorial).

## tools/package.js

The `package.js` script (run via `yarn build`) builds all the libraries and prepares all publishable libraries for releasing.

After running `nx build` on all libraries, it then modifies the created `package.json`s to adjust dependency versions and other configuration required for publishing (production or locally).

Packages ready for deployment are placed in `dist/npm`.

## tools/publish.sh

The `publish.sh` script (run by `nx-release.js`) publishes the libraries from `dist/npm`.
