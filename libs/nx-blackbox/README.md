# nx-blackbox

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build nx-blackbox` to build the library.

# Usage

The generated project is an altered `@nrwl/node:application` that is stripped of the `build` & `serve` targets,
But added the following targets:

- `up` - runs a command to set-up dependencies, currently it's using `docker-compose` but we can update it to use tilt or whatever command we want.
- `down` - runs a command to tear-down dependencies.
- `e2e` - runs `nx up <project>`, `nx test <project>` and `nx down <project>` sequentially.

So after generating a project (described below), you can run `nx e2e <blackbox project name>` and it should _Just Work™_.

## Creating an E2E Project

```bash
yarn nx generate @gioragutt/nx-blackbox:blackbox-project
```

Will generate an e2e project for the default project of the workspace

```bash
yarn nx generate @gioragutt/nx-blackbox:blackbox-project --project=tags-api
```

```bash
yarn nx generate @gioragutt/nx-blackbox:blackbox-project --port=6000
```

Will generate an e2e project set-up to use the given port

```bash
yarn nx generate @gioragutt/nx-blackbox:blackbox-project --wiremock
```

Will generate an e2e project with `wiremock` boilerplate set up

```bash
yarn nx generate @gioragutt/nx-blackbox:blackbox-project --oidc-server-mock
```

Will generate an e2e project with `oidc-server-mock` boilerplate set up

```bash
yarn nx generate @gioragutt/nx-blackbox:blackbox-project --name=my-blackbox-project
```

Will generate an e2e project named `"my-blackbox-project"`

```bash
yarn nx generate @gioragutt/nx-blackbox:blackbox-project \
  --name=test-e2e-app \
  --project=tags-api \
  --oidc-server-mock \
  --wiremock
```

Will do all over the above

## Adding `wiremock` support to existing e2e projects

```bash
yarn nx generate @gioragutt/nx-blackbox:wiremock --project=test-e2e-app
```

## Adding `oidc-server-mock` support to existing e2e projects

```bash
yarn nx generate @gioragutt/nx-blackbox:oidc-server-mock --project=test-e2e-app
```

## Running unit tests

Run `nx test nx-blackbox` to execute the unit tests via [Jest](https://jestjs.io).
