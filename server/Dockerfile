FROM golang:1.27.4@sha256:205c7636d74e0ffbe3d007162df7d74f859f5a8c8322dfb9f907977686c126cf AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api && \
    CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate

FROM alpine:3.24@sha256:ce9e1e6d23f04a0b7593445a062a9fc73ed52f8260b9396f77a958295ad18ee7
RUN apk add --no-cache ca-certificates
WORKDIR /app/cmd/migrate
COPY --from=build /out/ /app/
COPY cmd/migrate/migrations ./migrations
COPY cmd/migrate/seeds ./seeds
USER 65532:65532
EXPOSE 8080
CMD ["/app/api"]
