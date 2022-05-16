import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { RandomProvider, Pet } from "@cdktf/provider-random";

export class TestStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new RandomProvider(this, "random");

    const pet = new Pet(this, "pet-resource", {
      keepers: {
        "keeper": "fixed"
      }
    });

    new TerraformOutput(this, "pet", {
      value: pet.id,
      staticId: true
    })
  }
}

const app = new App();
new TestStack(app, "testing");
app.synth();

