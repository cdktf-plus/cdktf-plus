import { ITerraformDependable } from "cdktf";

export interface IDockerRepository {
  readonly name: string;
  readonly url: string;
  readonly authorizationPassword: string;
  readonly authorizationUser: string;
  readonly dependable: ITerraformDependable
}