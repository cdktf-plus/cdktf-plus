import { Resource } from 'cdktf';
import { Construct, Node } from 'constructs';
import { Policy } from '../aws-iam';
import * as aws from '@cdktf/provider-aws';
import * as iam from 'iam-floyd';

export interface TargetProps {
  readonly eventBridge: aws.CloudwatchEventBus;
  readonly target: aws.SfnStateMachine | aws.LambdaFunction;
  readonly eventPattern: Record<string, any>;
}

export class EventBridgeTarget extends Resource {
  constructor(scope: Construct, id: string, props: TargetProps) {
    super(scope, id);

    const { target, eventBridge, eventPattern } = props;

    // There's a AWS Provider bug preventing this resource
    // being recreated properly when the eventBusName changes
    const rule = new aws.CloudwatchEventRule(this, 'rule', {
      name: `${id}-${Node.of(target).id}`,
      eventBusName: eventBridge.name,
      eventPattern: JSON.stringify(eventPattern)
    })


    if (target instanceof aws.SfnStateMachine) {
      const policies: aws.IamRoleInlinePolicy[] = [];

      policies.push({
        name: `${id}-allow-invoke-stepfucntion`,
        policy: Policy.document(
          new iam.States()
            .allow()
            .toStartExecution()
            .on(target.arn)
        )
      })
      const role = new aws.IamRole(this, 'integration-role', {
        name: `${id}-integration-role`,
        assumeRolePolicy: Policy.document(new iam.Sts()
          .allow()
          .toAssumeRole()
          .forService('events.amazonaws.com')
        ),
        inlinePolicy: policies
      })

      new aws.CloudwatchEventTarget(this, 'target', {
        targetId: `${id}-${Node.of(target).id}`,
        eventBusName: eventBridge.name,
        rule: rule.name,
        arn: target.arn,
        roleArn: role.arn
      })
    }

    if (target instanceof aws.LambdaFunction) {
      new aws.CloudwatchEventTarget(this, 'target', {
        targetId: `${id}-${Node.of(target).id}`,
        eventBusName: eventBridge.name,
        rule: rule.name,
        arn: target.arn,
      })

      new aws.LambdaPermission(this, 'lambda-permission', {
        functionName: target.arn,
        action: "lambda:InvokeFunction",
        principal: "events.amazonaws.com",
        sourceArn: rule.arn
      })
    }
  }
}