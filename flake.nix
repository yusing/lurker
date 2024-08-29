{
  inputs = {

    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

  };

  outputs =
    { self
    , nixpkgs
    }:
    let
      supportedSystems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
      nixpkgsFor = forAllSystems (system:
        import nixpkgs {
          inherit system;
          overlays = [ self.overlays.default ];
        });

    in
    {
        overlays.default = final: prev: {
            node_modules = with final; stdenv.mkDerivation {
                pname = "readit-node-modules";
                version = "0.0.1";
                impureEnvVars = lib.fetchers.proxyImpureEnvVars
                ++ [ "GIT_PROXY_COMMAND" "SOCKS_SERVER" ];
                src = ./.;
                nativeBuildInputs = [ bun ];
                buildInputs = [ nodejs-slim_latest ];
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
                outputHash = "sha256-qFYgRIarDChHQu0ZrUKd/Y61gxaagMWpf2h9xizwGv4=";
                outputHashAlgo = "sha256";
                outputHashMode = "recursive";
            };
            readit = with final; stdenv.mkDerivation {
                pname = "readit";
                version = "0.0.1";
                src = ./.;
                nativeBuildInputs = [ makeBinaryWrapper ];
                buildInputs = [ bun ];

                buildPhase = ''
                    runHook preBuild


                    runHook postBuild
                '';

                dontFixup = true;

                installPhase = ''
                    runHook preInstall

                    mkdir -p $out/bin

                    # cp app.js $out/app.js
                    cp -R ./* $out

                    # bun is referenced naked in the package.json generated script
                    # makeBinaryWrapper ${bun}/bin/bun $out/bin/$pname \
                    #   --add-flags "run --prefer-offline --no-install $out/app.js"

                    makeBinaryWrapper ${bun}/bin/bun $out/bin/$pname \
                    --prefix PATH : ${lib.makeBinPath [ bun ]} \
                    --add-flags "run --prefer-offline --no-install $out/src/index.js"

                '';
            };
        };

      devShell = forAllSystems (system:
        let
          pkgs = nixpkgsFor."${system}";
        in
        pkgs.mkShell {
          nativeBuildInputs = [
              pkgs.bun
          ];
          RUST_BACKTRACE = 1;
        });

        packages = forAllSystems(system: {
            inherit (nixpkgsFor."${system}") readit node_modules;
        });
    };
}


