import { Construct } from 'constructs';
import { TerraformOutput } from 'cdktf';
import * as aws from '@cdktf/provider-aws';
import { DockerAsset } from '@cdktf-plus/core'
import { AwsLambdaFunction, AwsLambdaFunctionConfig } from '../aws-lambda-function';
import { AwsEcrRepository } from '../aws-ecr-repository';

export interface DockerFunctionConfig extends AwsLambdaFunctionConfig {
  readonly path: string;
}

export class DockerFunction extends AwsLambdaFunction {
  public readonly dockerAsset: DockerAsset;

  constructor(scope: Construct, name: string, config: DockerFunctionConfig) {
    const { path, ...rest } = config;
    super(scope, name, rest);

    const repository = new AwsEcrRepository(scope, 'ecr-repo', {
      name
    });

    this.dockerAsset = new DockerAsset(this, 'asset', {
      path,
      repository
    });

    this.fn.imageUri = this.dockerAsset.dockerImage.url;
    this.fn.packageType = "Image";
    this.fn.publish = true;

    new aws.lambdafunction.LambdaAlias(this, 'alias', {
      name: "local",
      functionVersion: this.fn.version,
      functionName: this.fn.arn
    })

    new TerraformOutput(this, 'lambda-arn', {
      value: this.fn.arn
    })

    new TerraformOutput(this, 'ecr-url', {
      value: this.dockerAsset.dockerImage.url
    })
  }
}