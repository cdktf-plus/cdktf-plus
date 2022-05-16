import * as path from 'path';
import { testRunner, CdktfStack } from '../lib';

describe("My CDKTF Application", () => {
  //@ts-ignore
  let globalStack: CdktfStack;

  it("successfully deploys", async () => {
    const outdir = path.join(__dirname, 'cdktf.test.out');
    const command = `npx ts-node ${path.join(__dirname, 'fixtures', 'app.ts')}`

    const { stack } = await testRunner(command, outdir);

    globalStack = stack;

    await stack.deploy();

    console.log({ outputs: stack.outputs });

    expect(stack.outputs!.pet.value.lenght).not.toEqual(0)
  }, 30_000)
});