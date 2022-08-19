# gioragutt/nx-plugins

## Creating a new nx plugin

Use `yarn nx workspace-generator new-plugin --name=nx-plugin-name` or generate it using the NxConsole.

> Plugin names must start with `"nx-"` (see [conventions](docs/conventions.md))

## Creating a new publishable library

Use `yarn nx workspace-generator new-publishable-lib --name=nx-lib-name` or generate it using the NxConsole.

> Library names must start with `"nx-"` (see [conventions](docs/conventions.md))

## Updating configuration

If you happen to find a change that's required to all plugins, after updating those plugins, please be sure to update [`tools/generators/new-plugin/index.ts`](tools/generators/new-plugin/index.ts) so that any new plugins will be created with the correct configuration.

This also acts as living documentation of what configuration we're changing from the default.

## CI

### E2E

Currently the e2e ci is altered to run in separate jobs, since running them in parallel caused problems due to the testing code working on the same directory (`/tmp/nx-e2e/proj`) and therefor setup/teardown would cause conflict.

When locally running the e2e jobs, it is suggested to not run jobs concurrently, meaning `yarn nx run-many --target=e2e --all` without `--parallel`.
