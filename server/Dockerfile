FROM golang:1.27.4@sha256:5e8afd493a7124a8586e134d9b532731161d4b9becf9dee5a5956b107426f93d AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api && \
    CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate

FROM alpine:3.24@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf
RUN apk add --no-cache ca-certificates
WORKDIR /app/cmd/migrate
COPY --from=build /out/ /app/
COPY cmd/migrate/migrations ./migrations
COPY cmd/migrate/seeds ./seeds
USER 65532:65532
EXPOSE 8080
CMD ["/app/api"]
