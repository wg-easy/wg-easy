FROM rust:1-alpine
RUN rustup target add x86_64-unknown-linux-musl
WORKDIR /usr