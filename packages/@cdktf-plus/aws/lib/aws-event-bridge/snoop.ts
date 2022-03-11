import { Resource, TerraformOutput, IAspect } from 'cdktf';
import { IConstruct, Construct } from 'constructs';
import { EventBridgeTarget } from './integration';
import { NodejsLambdaFunction } from '../nodejs-lambda-function';
import * as aws from '@cdktf/provider-aws';
import * as path from 'path';

export interface EventBridgeSnoopProps {
  readonly eventBridge: aws.eventbridge.CloudwatchEventBus;
}

export class EventBridgeSnoop extends Resource {
  constructor(scope: Construct, id: string, props: EventBridgeSnoopProps) {
    super(scope, id);

    const { eventBridge } = props;

    const lambda = new NodejsLambdaFunction(this, 'authorizer', {
      path: path.join(__dirname, 'handler/index.ts'),
      logRetentionInDays: 1,
      memorySize: 128,
    })

    new TerraformOutput(this, 'snoop-log-group', {
      value: lambda.logGroup.name
    })

    new EventBridgeTarget(this, 'lambda-invoke', {
      eventBridge,
      target: lambda.fn,
      eventPattern: {
        source: [
          { 'prefix': 'com.cdktf.provider-db' }
        ]
      }
    })
  }
}

export class SnoopEventsAspect implements IAspect {
  constructor() {}

  public visit(node: IConstruct): void {
    if (node instanceof aws.eventbridge.CloudwatchEventBus) {
      new EventBridgeSnoop(node, 'snoop-events', {
        eventBridge: node
      })
    }
  }
}
