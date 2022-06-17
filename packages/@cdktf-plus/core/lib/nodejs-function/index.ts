import * as path from 'path';
import { Resource, TerraformAsset, AssetType } from 'cdktf';
import { Construct } from 'constructs';
// This might be 10x slower than a native build - see https://esbuild.github.io/getting-started/#wasm
import { buildSync } from 'esbuild-wasm';

export interface NodejsFunctionConfig {
  readonly path: string;
  readonly external?: string[];
}

const bundle = (workingDirectory: string, entryPoint: string, external?: string[]) => {
  buildSync({
    entryPoints: [entryPoint],
    platform: 'node',
    target: 'es2018',
    bundle: true,
    format: 'cjs',
    sourcemap: 'external',
    external,
    outdir: 'dist',
    absWorkingDir: workingDirectory,
  });

  return path.join(workingDirectory, 'dist');
};

export class NodejsFunction extends Resource {
  public readonly asset: TerraformAsset;
  public readonly bundledPath: string;

  constructor(scope: Construct, id: string, config: NodejsFunctionConfig) {
    super(scope, id);

    const workingDirectory = path.resolve(path.dirname(config.path));
    const distPath = bundle(workingDirectory, path.basename(config.path));
    this.bundledPath = path.join(distPath, `${path.basename(config.path, '.ts')}.js`);

    this.asset = new TerraformAsset(this, 'lambda-asset', {
      path: distPath,
      type: AssetType.ARCHIVE,
    });
  }
}