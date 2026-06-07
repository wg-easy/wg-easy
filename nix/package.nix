{
  lib,
  stdenv,
  nodejs_24,
  pnpm_11,
  pnpmConfigHook,
  fetchPnpmDeps,
  makeWrapper,
  python3,
  pkg-config,
  bash,
  coreutils,
  gawk,
  gnugrep,
  gnused,
  iproute2,
  iptables,
  kmod,
  nftables,
  procps,
  wireguard-go,
  wireguard-tools,
}:

let
  nodejs = nodejs_24;
  runtimePath = lib.makeBinPath [
    bash
    coreutils
    gawk
    gnugrep
    gnused
    iproute2
    iptables
    kmod
    nftables
    procps
    wireguard-go
    wireguard-tools
  ];
in
stdenv.mkDerivation (finalAttrs: {
  pname = "wg-easy";
  version = "15.3.0";

  src = ../src;

  CI = true;

  nativeBuildInputs = [
    nodejs
    pnpm_11
    pnpmConfigHook
    makeWrapper
    python3
    pkg-config
  ];

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 3;
    hash = "sha256-nlbrxEob/s7ARrASaX5nfhaNaoTq+DusHZKh+ToHw70=";
  };

  buildPhase = ''
    runHook preBuild
    pnpm build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/share/wg-easy $out/bin
    cp -R .output/* $out/share/wg-easy/

    mkdir -p $out/share/wg-easy/server/database
    cp -R server/database/migrations $out/share/wg-easy/server/database/migrations

    if [ -e node_modules/libsql ]; then
      mkdir -p $out/share/wg-easy/server/node_modules
      cp -RL node_modules/libsql $out/share/wg-easy/server/node_modules/libsql
    fi

    makeWrapper ${lib.getExe nodejs} $out/bin/wg-easy \
      --run "cd $out/share/wg-easy" \
      --add-flags "$out/share/wg-easy/server/index.mjs" \
      --prefix PATH : ${runtimePath}

    makeWrapper ${lib.getExe nodejs} $out/bin/wg-easy-cli \
      --run "cd $out/share/wg-easy" \
      --add-flags "$out/share/wg-easy/server/cli.mjs" \
      --prefix PATH : ${runtimePath}

    runHook postInstall
  '';

  meta = {
    description = "WireGuard VPN server with a web-based admin UI";
    homepage = "https://github.com/wg-easy/wg-easy";
    license = lib.licenses.agpl3Only;
    platforms = lib.platforms.linux;
    mainProgram = "wg-easy";
  };
})
