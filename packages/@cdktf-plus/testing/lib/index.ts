import { CdktfStack } from "cdktf-cli/lib/cdktf-stack";
import { SynthStack } from "cdktf-cli/lib/synth-stack";
import { AbortController } from "node-abort-controller"

export class CdktfStackTestRunner extends CdktfStack {
  public async deploy() {
    await this['run'](async () => {
      const terraform = await this['initalizeTerraform']({ isSpeculative: false });

      this['updateState']({ type: "deploying", stackName: this.stack.name });
      await terraform.deploy(null, ['-refresh=false']);
      const outputs = await terraform.output();

      this['updateState']({
        type: "deployed",
        stackName: this.stack.name,
        outputs,
        outputsByConstructId: {},
      });
    });
  }
}

export const testRunner = async (command: string, outdir: string) => {
  const abortSignal = new AbortController().signal;
  const stacks = await SynthStack.synth(abortSignal, command, outdir);
  const stack = new CdktfStackTestRunner({
    stack: stacks[0],
    autoApprove: true,
    abortSignal,
    onLog: ({message}) => {
      console.debug(message);
    },
    onUpdate: (update) => {
      console.log(`${update.stackName}: ${update.type}`);
    }
  });

  return {
    abortSignal,
    stack,
  }
}

