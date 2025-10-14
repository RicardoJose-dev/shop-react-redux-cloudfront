import * as path from "path"
import * as cdk from "aws-cdk-lib"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as sqs from "aws-cdk-lib/aws-sqs"
import * as lambda_event_sources from "aws-cdk-lib/aws-lambda-event-sources"
import * as iam from "aws-cdk-lib/aws-iam"
import * as sns from "aws-cdk-lib/aws-sns"
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions"
import { Construct } from "constructs"

export class CatalogBatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    const catalogItemsSqs = new sqs.Queue(this, "catalogItemsQueue")

    const createProductTopic = new sns.Topic(this, "createProductTopic")

    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription("testrjgdum@gmail.com")
    )

    const filteredCreateProduct = new subscriptions.EmailSubscription(
      "filtertestrjgdum@gmail.com",
      {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            greaterThan: 49000,
          }),
        },
      }
    )

    createProductTopic.addSubscription(filteredCreateProduct)

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
        CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
      },
    })

    createProductTopic.grantPublish(lambdaFunction)

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
