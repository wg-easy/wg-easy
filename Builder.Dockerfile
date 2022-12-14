FROM rs-wg-builder as builder
COPY . /usr/src/rs-wg
WORKDIR /usr/src/rs-wg
RUN cargo build --target x86_64-unknown-linux-musl --release