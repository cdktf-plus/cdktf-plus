import { CdktfStack } from "cdktf-cli/lib/cdktf-stack";
import { SynthStack } from "cdktf-cli/lib/synth-stack";
import { AbortController } from "node-abort-controller"
export { CdktfStack };

export const testRunner = async (command: string, outdir: string) => {
  const abortSignal = new AbortController().signal;
  const stacks = await SynthStack.synth(abortSignal, command, outdir);
  const stack = new CdktfStack({
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

