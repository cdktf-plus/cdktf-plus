import { Construct } from "constructs";
import { TerraformOutput, Resource  } from 'cdktf';
import * as Null from "@cdktf/provider-null";
import * as hashdirectory from 'hashdirectory';
import { IDockerRepository } from './docker-repository'
import { CustomDockerImage } from './docker-image'

export interface DockerAssetConfig {
  readonly path: string;
  readonly repository: IDockerRepository;
}

export class DockerAsset extends Resource {
  public repository: IDockerRepository;
  public readonly workingDirectory: string;
  public readonly buildAndPush: Null.Resource;
  public readonly dockerImage: CustomDockerImage;

  constructor(scope: Construct, name: string, config: DockerAssetConfig) {
    super(scope, name);
    this.repository = config.repository;
    this.workingDirectory = config.path
    this.buildAndPush = new Null.Resource(this, 'buildAndPush', {
      triggers: {
        folderhash: hashdirectory.sync(this.workingDirectory),
        name: this.repository.name
      }
    });

    this.buildAndPush.addOverride('depends_on', [this.repository.dependable.fqn])
    this.dockerBuildCommand()

    this.dockerImage = new CustomDockerImage(this, 'image', {
      repository: this.repository,
      dependsOn: [this.buildAndPush]
    })
  }

  protected addOutput(): void {
    new TerraformOutput(this, 'docker-repository-url', {
      value: this.repository.url
    })
  }

  protected dockerBuildCommand(): void {
    const imageName = this.repository.url;

    const command = `
      docker login --username ${this.repository.authorizationUser} --password ${this.repository.authorizationPassword} ${imageName} &&
      cd ${this.workingDirectory} && docker build -t ${imageName} . &&
      docker push ${imageName}
    `;
    this.buildAndPush.addOverride('provisioner.local-exec.command', command);
  }
}