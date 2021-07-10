import * as path from 'path';
import { TerraformAsset, AssetType } from 'cdktf';
import { Construct } from 'constructs';
import { buildSync } from 'esbuild';
import { AwsLambdaFunction, AwsLambdaFunctionConfig } from '../aws-lambda-function';

export interface NodejsFunctionConfig extends AwsLambdaFunctionConfig {
  readonly path: string;
}

const bundle = (workingDirectory: string, entryPoint: string) => {
  buildSync({
    entryPoints: [entryPoint],
    platform: 'node',
    target: 'es2018',
    bundle: true,
    format: 'cjs',
    sourcemap: 'external',
    outdir: 'dist',
    absWorkingDir: workingDirectory,
  });

  return path.join(workingDirectory, 'dist');
};

export class NodejsFunction extends AwsLambdaFunction {
  public readonly asset: TerraformAsset;
  public readonly bundledPath: string;

  constructor(scope: Construct, id: string, config: NodejsFunctionConfig) {
    const { path: filePath, ...rest } = config;
    super(scope, id, rest);

    const workingDirectory = path.resolve(path.dirname(config.path));
    const distPath = bundle(workingDirectory, path.basename(config.path));
    this.bundledPath = path.join(distPath, `${path.basename(config.path, '.ts')}.js`);

    this.asset = new TerraformAsset(this, 'lambda-asset', {
      path: distPath,
      type: AssetType.ARCHIVE,
    });

    this.fn.handler = 'index.handler';
    this.fn.filename = this.asset.path;
    this.fn.sourceCodeHash = this.asset.assetHash;
    this.fn.runtime = 'nodejs14.x';
  }
}