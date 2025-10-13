import * as path from "path"
import * as cdk from "aws-cdk-lib"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as sqs from "aws-cdk-lib/aws-sqs"
import * as lambda_event_sources from "aws-cdk-lib/aws-lambda-event-sources"
import * as iam from "aws-cdk-lib/aws-iam"
import { Construct } from "constructs"

export class CatalogBatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    const catalogItemsSqs = new sqs.Queue(this, "catalogItemsQueue")

    const lambdaFunction = new lambda.Function(this, "catalogBatchProcess", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handlercatalogBatchProcess.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      environment: {
        CREATE_PRODUCT_LAMBDA_NAME: cdk.Fn.importValue(
          "CreateProductLambdaName"
        ),
      },
    })

    lambdaFunction.addEventSource(
      new lambda_event_sources.SqsEventSource(catalogItemsSqs, {
        batchSize: 5,
      })
    )

    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [cdk.Fn.importValue("CreateProductLambdaArn")],
      })
    )

    new cdk.CfnOutput(this, "SQSQueueArn", {
      value: catalogItemsSqs.queueArn,
      exportName: "SQSQueueArn",
    })

    new cdk.CfnOutput(this, "SQSQueueName", {
      value: catalogItemsSqs.queueName,
      exportName: "SQSQueueName",
    })
  }
}
