# llamactl-console frontend

## Quickstart

> Ensure that you have Bun installed

In order to get started with development, run the commands provided below. 

```sh
# install development dependencies
bun install
```

```sh
# run the dev server
bun run dev
```

## API proxy in development

The frontend expects API calls under `/api` and proxies them to the backend while running `vite`.

```sh
# optional: point to a different backend target (default: http://localhost:8000)
VITE_API_PROXY_TARGET=http://localhost:8000 bun run dev
```
