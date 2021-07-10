import { Construct } from 'constructs';
import { Resource } from 'cdktf';
import * as aws from '@cdktf/provider-aws';
import { EventBridgeTarget } from './integration';

export class AwsEventBridge extends Resource {
  public readonly bus: aws.CloudwatchEventBus;
  public readonly name: string;

  constructor(scope: Construct, name: string) {
    super(scope, name);


    this.bus = new aws.CloudwatchEventBus(this, 'event-bridge', {
      name
    })

    this.name = this.bus.name;
  }

  public addIntegration(target: aws.SfnStateMachine | aws.LambdaFunction, eventPattern: Record<string, any>) {
    return new EventBridgeTarget(this, `${target.friendlyUniqueId}-integration`, {
      target,
      eventPattern,
      eventBridge: this.bus,
    });
  }
}