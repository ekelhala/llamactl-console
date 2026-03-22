APP_NAME=llamactl-console-backend

.PHONY: run build test tidy

run:
	go run ./cmd/server

build:
	mkdir -p bin
	go build -o bin/$(APP_NAME) ./cmd/server

test:
	go test ./...

tidy:
	go mod tidy
