import { Construct, Node } from 'constructs';
import { Resource, TerraformOutput } from 'cdktf';
import * as aws from '@cdktf/provider-aws';
import { AwsServiceRole } from '../aws-iam';
import * as iam from 'iam-floyd';

export interface AwsLambdaFunctionConfig {
  /**
   * The environment variables to be passed to the Lambda function.
   */
  readonly environment?: {[key: string]: string};

  /**
   * The log retention period in days. Defaults to 7.
   */
  readonly logRetentionInDays?: number;

  /**
   * The memory limit in MB. Defaults to 512.
   */
  readonly memorySize?: number;

  /**
   * The timout in seconds. Defaults to 15.
   */
  readonly timeout?: number;
}

export class AwsLambdaFunction extends Resource {
  public readonly fn: aws.LambdaFunction;
  public readonly serviceRole: AwsServiceRole;
  public readonly logGroup: aws.CloudwatchLogGroup;;

  constructor(scope: Construct, name: string, config: AwsLambdaFunctionConfig) {
    super(scope, name);

    const { environment: variables, logRetentionInDays = 7, memorySize = 512, timeout = 15 } = config;

    const id = Node.of(this).addr
    const fnName = `${name}-${id}`;

    const logGroup = new aws.CloudwatchLogGroup(this, 'snoop-log-group', {
      name: `/aws/lambda/${fnName}`,
      retentionInDays: logRetentionInDays
    });

    this.logGroup = logGroup;

    this.serviceRole = new AwsServiceRole(this, 'server-role', {
      service: 'lambda.amazonaws.com',
      policyStatements: [
        new iam.Logs()
          .allow()
          .toCreateLogStream()
          .toPutLogEvents()
          .on(logGroup.arn, `${logGroup.arn}:log-stream:*`)
      ]
    })

    this.fn = new aws.LambdaFunction(this, 'fn', {
      functionName: fnName,
      role: this.serviceRole.role.arn,
      memorySize,
      timeout,
      dependsOn: [logGroup]
    })

    if (variables) {
      this.fn.environment = [{
        variables
      }]
    }

    new TerraformOutput(this, `${fnName}-lambda-arn`, {
      value: this.fn.arn
    })
  }
}