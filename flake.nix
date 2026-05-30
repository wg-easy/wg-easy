{
  description = "Nix package and NixOS module for wg-easy";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      linuxSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      formatterSystems = linuxSystems ++ [
        "aarch64-darwin"
        "x86_64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs linuxSystems;
      forFormatterSystems = nixpkgs.lib.genAttrs formatterSystems;
      pkgsFor = system: import nixpkgs { inherit system; };
    in
    {
      packages = forAllSystems (system: {
        wg-easy = (pkgsFor system).callPackage ./nix/package.nix { };
        default = self.packages.${system}.wg-easy;
      });

      checks = forAllSystems (system: {
        package = self.packages.${system}.wg-easy;
      });

      devShells = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_24
              pnpm_11
              wireguard-tools
              wireguard-go
              iptables
              nftables
            ];
          };
        }
      );

      formatter = forFormatterSystems (
        system:
        let
          pkgs = pkgsFor system;
        in
        pkgs.writeShellApplication {
          name = "wg-easy-nix-fmt";
          runtimeInputs = [ pkgs.nixfmt ];
          text = ''
            if [ "$#" -eq 0 ]; then
              set -- flake.nix nix/*.nix
            fi

            exec nixfmt "$@"
          '';
        }
      );

      nixosModules.default = import ./nix/module.nix;
      nixosModules.wg-easy = self.nixosModules.default;
    };
}
