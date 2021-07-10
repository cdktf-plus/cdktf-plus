import { Construct, } from "constructs";
import { ITerraformDependable, Resource } from 'cdktf';
import { EcrRepository, DataAwsEcrAuthorizationToken } from "@cdktf/provider-aws";
import { IDockerRepository } from '@cdktf-plus/core'

export interface AwsEcrRepositoryConfig {
  readonly name: string;
}

export class AwsEcrRepository extends Resource implements IDockerRepository {
  public readonly name: string;
  public readonly resource: EcrRepository;
  public readonly dependable: ITerraformDependable;;
  public readonly url: string;
  public readonly authorizationPassword: string;
  public readonly authorizationUser: string;

  constructor(scope: Construct, name: string, config: AwsEcrRepositoryConfig) {
    super(scope, name);

    this.name = config.name;

    this.resource = new EcrRepository(this, 'ecr-repository', {
      name: config.name,
    });

    const data = new DataAwsEcrAuthorizationToken(this, 'ecr-repository-token', {
      dependsOn: [this.resource]
    })

    this.authorizationPassword = data.password
    this.authorizationUser = data.userName
    this.url = this.resource.repositoryUrl;
    this.dependable = data
  }
}