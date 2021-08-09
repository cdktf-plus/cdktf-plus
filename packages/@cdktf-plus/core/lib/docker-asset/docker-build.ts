import { Construct, Node } from "constructs";
import { Resource } from 'cdktf';
import * as hashdirectory from 'hashdirectory';
import * as execa from 'execa';
import { mkdtempSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DockerBuildConfig {
  readonly path: string;
}

export class DockerBuild extends Resource {
  public readonly folderHash: string;
  public readonly workingDirectory: string;
  public readonly imageName: string;

  constructor(scope: Construct, name: string, config: DockerBuildConfig) {
    super(scope, name);

    this.workingDirectory = config.path
    this.folderHash = hashdirectory.sync(config.path);
    this.imageName = Node.of(this).addr;
  }

  // the following code around Docker is inspired by https://github.com/aws/aws-cdk/blob/ebfc0e092addbcf21562ce63328457285f7b2d77/packages/%40aws-cdk/core/lib/bundling.ts#L258

  public buildImage(): void {
    dockerExec(['build', '-t', this.imageName, '.'], this.workingDirectory)
  }

  public cp(imagePath: string, outputPath?: string): string {
    const { stdout } = dockerExec(['create', this.imageName], this.workingDirectory);
    const match = stdout.toString().match(/([0-9a-f]{16,})/);
    if (!match) {
      throw new Error('Failed to extract container ID from Docker create output');
    }

    const containerId = match[1];
    const containerPath = `${containerId}:${imagePath}`;
    const destPath = outputPath ?? mkdtempSync(path.join(os.tmpdir(), 'cdktf-docker-cp-'));
    try {
      dockerExec(['cp', containerPath, destPath], this.workingDirectory);
      return destPath;
    } catch (err) {
      throw new Error(`Failed to copy files from ${containerPath} to ${destPath}: ${err}`);
    } finally {
      dockerExec(['rm', '-v', containerId], this.workingDirectory);
    }
  }
}

const dockerExec = (args: string[], cwd: string) => {
  try {
    return execa.sync('docker', args, { shell: true, cwd})
  } catch (e) {
    console.log(e);
    throw new Error(`Failed to execute docker: ${e}`);
  }
}