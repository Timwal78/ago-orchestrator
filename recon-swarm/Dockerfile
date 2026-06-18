FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /recon-swarm ./cmd/recon

FROM alpine:3.19
RUN apk --no-cache add ca-certificates wget
WORKDIR /app
COPY --from=builder /recon-swarm .
EXPOSE 8081
CMD ["./recon-swarm"]
