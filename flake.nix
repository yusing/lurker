{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    supportedSystems = ["x86_64-linux" "aarch64-linux" "aarch64-darwin"];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    nixpkgsFor = forAllSystems (system:
      import nixpkgs {
        inherit system;
        overlays = [
            self.overlays.default
        ];
      });
  in {
    overlays.default = final: prev: {
      node_modules = with final;
        stdenv.mkDerivation {
          pname = "readit-node-modules";
          version = "0.0.1";
          impureEnvVars =
            lib.fetchers.proxyImpureEnvVars
            ++ ["GIT_PROXY_COMMAND" "SOCKS_SERVER"];
          src = ./.;
          nativeBuildInputs = [bun];
          buildInputs = [nodejs-slim_latest];
          dontConfigure = true;
          dontFixup = true;
          buildPhase = ''
            bun install --no-progress --frozen-lockfile
          '';
          installPhase = ''
            mkdir -p $out/node_modules
            cp -R ./node_modules/* $out/node_modules
            ls -la $out/node_modules
          '';
          outputHash = "sha256-k77Ht47QBQUmoGp2zxBwVIjQ9fwnIGCqcqBLK6/d6jM=";
          outputHashAlgo = "sha256";
          outputHashMode = "recursive";
        };
      readit = with final;
        stdenv.mkDerivation {
          pname = "readit";
          version = "0.0.1";
          src = ./.;
          nativeBuildInputs = [makeBinaryWrapper];
          buildInputs = [bun];

          buildPhase = ''
            runHook preBuild


            runHook postBuild
          '';

          dontFixup = true;

          installPhase = ''
            runHook preInstall

            mkdir -p $out/bin

            ln -s ${node_modules}/node_modules $out
            cp -R ./* $out

            # bun is referenced naked in the package.json generated script
            # makeBinaryWrapper ${bun}/bin/bun $out/bin/$pname \
            #   --add-flags "run --prefer-offline --no-install $out/app.js"

            makeBinaryWrapper ${bun}/bin/bun $out/bin/$pname \
            --prefix PATH : ${lib.makeBinPath [bun]} \
            --add-flags "run --prefer-offline --no-install $out/src/index.js"

          '';
        };
    };

    devShell = forAllSystems (system: let
      pkgs = nixpkgsFor."${system}";
    in
      pkgs.mkShell {
        nativeBuildInputs = [
          pkgs.bun
          pkgs.biome
        ];
      });

    packages = forAllSystems (system: {
      inherit (nixpkgsFor."${system}") readit node_modules;
    });

    defaultPackage = forAllSystems (system: nixpkgsFor."${system}".readit);

    apps = forAllSystems (system: let
      pkgs = nixpkgsFor.${system};
    in {
      default = {
        type = "app";
        program = "${pkgs.readit}/bin/readit";
      };
    });

    formatter = forAllSystems (system: nixpkgsFor."${system}".alejandra);

    nixosModules.default = {
      config,
      pkgs,
      lib,
      ...
    }:
      with lib; {
        options = {
          services.readit = {
            enable = mkOption {
              type = types.bool;
              default = false;
              description = "Enable readit";
            };
            port = mkOption {
              type = types.int;
              default = 3000;
              description = "Port to run readit on";
            };
          };
        };

        config = mkIf config.services.readit.enable {
          nixpkgs.overlays = [self.overlays.default];
          systemd.services.readit = {
            description = "readit service";
            wantedBy = ["multi-user.target"];

            serviceConfig = {
              ListenStream = "0.0.0.0:${toString config.services.readit.port}";
              ExecStart = "${pkgs.readit}/bin/readit";
              Restart = "always";
            };

            # If the binary needs specific environment variables, set them here
            environment = {
              READIT_PORT = "${toString config.services.readit.port}";
            };
          };
        };
      };
  };
}
