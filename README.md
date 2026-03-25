# llamactl-console

A separate companion project for [llamactl](https://github.com/lordmathis/llamactl), focused on building a dedicated web UI around the existing project.

This project combines:
- Go for the backend proxy and API layer
- React for the management console UI
- Vite for frontend development and bundling
- Bun for frontend package management and local scripts

I started this project because I really like the original llamactl project and wanted to explore a more dedicated investment in the UI and overall console experience.

## Quickstart

Prerequisites:
- Go
- Bun

Frontend:

```sh
cd frontend
bun install
bun run dev
```

Backend:

```sh
cd backend
cp config.example.yaml config.yaml
make run
```

To use a different configuration file path:

```sh
cd backend
go run ./cmd/server --config ./config.local.yaml
```

Note: This project is still a work in progress. Not all APIs or features are implemented yet. 🚧
