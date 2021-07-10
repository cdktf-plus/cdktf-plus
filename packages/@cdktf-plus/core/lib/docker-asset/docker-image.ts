
import { Construct, } from "constructs";
import { TerraformResource } from 'cdktf';
import { CustomDataSource } from '../custom-data-source'
import { IDockerRepository } from "./docker-repository";

export interface CustomDockerImageConfig {
  readonly repository: IDockerRepository,
  readonly dependsOn?: TerraformResource[];
}

export class CustomDockerImage extends CustomDataSource  {
  public readonly digest: string;
  public readonly url: string;

  constructor(scope: Construct, name: string, config: CustomDockerImageConfig) {
    const { repository } = config;

    super(scope, name, {
      inputs: {
        repositoryUrl: repository.url,
        username: repository.authorizationUser,
        password: repository.authorizationPassword
      },
      code: async (args: any) => {
        const drc = require('docker-registry-client')
        return new Promise((resolve, reject) => {
          var rar = drc.parseRepoAndRef(args.repositoryUrl);
          var client = drc.createClientV2({
            repo: rar,
            insecure: false,
            username: args.username,
            password: args.password,
            maxSchemaVersion: 2
          });
          var tagOrDigest = rar.tag || rar.digest;
          client.getManifest({ref: tagOrDigest}, function (err:any, _manifest:any, _res:any, manifestStr:any) {
            client.close();
            if (err) {
              reject(err)
            }
            resolve({sha256Digest: drc.digestFromManifestStr(manifestStr)});
          });
        });
      },
      dependsOn: config.dependsOn
    });

    this.digest = this.data.result('sha256Digest');
    this.url = `${repository.url}@${this.digest}`
  }
}