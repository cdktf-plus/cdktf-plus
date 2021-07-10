import { Construct, Node } from "constructs";
import { Resource, TerraformResource, TerraformAsset, AssetType } from 'cdktf';
import * as fs from "fs";
import * as path from 'path'
import { DataExternal } from "@cdktf/provider-external"

export interface ICustomDataSourceConfig {
  code(input: any): Promise<any>
  readonly inputs: any;
  readonly dependsOn?: TerraformResource[];
}

export abstract class CustomDataSource extends Resource {
  public readonly data: DataExternal;
  protected workingDirectory?: string;

  constructor(scope: Construct, name: string, config: ICustomDataSourceConfig) {
    super(scope, name);

    const { code, inputs, dependsOn } = config;
    const filePath = this.writeHandler(code);

    const asset = new TerraformAsset(this, 'data-source-asset', {
      path: filePath,
      type: AssetType.FILE,
    });

    this.data = new DataExternal(this, 'external', {
      program: ['node', asset.path],
      query: inputs,
      dependsOn
    })
  }

  private writeHandler(code: (input: any) => Promise<any>) {
    const name = Node.of(this).addr
    const tmpWorkDir = path.join(process.cwd(), 'tmp', 'build', 'data-soruces')
    fs.mkdirSync(tmpWorkDir, { recursive: true })
    const filePath = path.join(tmpWorkDir, `${name}-data-source.js`)

    fs.writeFileSync(filePath, `
    const handler = ${code.toString()}
    const stdin = process.stdin,
      stdout = process.stdout,
      inputChunks = [];

    stdin.setEncoding('utf8');

    stdin.on('data', function (chunk) {
      inputChunks.push(chunk)
    });

    stdin.on('end', async function () {
      const input = JSON.parse(inputChunks.join(''))
      try {
        const output = await handler(input)
        stdout.write(JSON.stringify(output));
        stdout.write('\\n');
      } catch(e) {
        console.error("error", e)
      }
    })
    `)
  return filePath;
  }
}