FROM golang:1.27.3 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api && \
    CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate

FROM alpine:3.24
RUN apk add --no-cache ca-certificates
WORKDIR /app/cmd/migrate
COPY --from=build /out/ /app/
COPY cmd/migrate/migrations ./migrations
COPY cmd/migrate/seeds ./seeds
USER 65532:65532
EXPOSE 8080
CMD ["/app/api"]
