import * as lambda from "aws-cdk-lib/aws-lambda"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cdk from "aws-cdk-lib"
import * as path from "path"
import * as cr from "aws-cdk-lib/custom-resources"
import * as iam from "aws-cdk-lib/aws-iam"
import { Construct } from "constructs"
import { aws_s3, RemovalPolicy } from "aws-cdk-lib"
import { URL_ORIGIN } from "../constants"

const corsHeaders = {
  "method.response.header.Access-Control-Allow-Origin": `'${URL_ORIGIN}'`,
  "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET'",
  "method.response.header.Access-Control-Allow-Headers":
    "'Content-Type,Authorization'",
}

const responseParameters = {
  ...corsHeaders,
  "method.response.header.Content-Type": true,
  "method.response.header.Access-Control-Allow-Origin": true,
  "method.response.header.Access-Control-Allow-Methods": true,
  "method.response.header.Access-Control-Allow-Headers": true,
}

const responseTemplates = {
  "application/json": "$input.body",
}

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    const importBucket = new aws_s3.Bucket(this, "ImportBucket", {
      versioned: true,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [aws_s3.HttpMethods.PUT],
          allowedOrigins: [URL_ORIGIN],
          allowedHeaders: ["*"],
          maxAge: 300,
        },
      ],
    })

    new cr.AwsCustomResource(this, "InitUploadedFolder", {
      onCreate: {
        service: "S3",
        action: "putObject",
        parameters: {
          Bucket: importBucket.bucketName,
          Key: "uploaded/",
          Body: "",
        },
        physicalResourceId: cr.PhysicalResourceId.of("InitUploadedFolder"),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [importBucket.arnForObjects("*")],
      }),
    })

    const importFileParserLambdaFunction = new lambda.Function(
      this,
      "importFileParser",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "handlerImportFileParser.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          SQS_QUEUE_NAME: cdk.Fn.importValue("SQSQueueName"),
        },
      }
    )

    importFileParserLambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:GetQueueUrl", "sqs:SendMessage"],
        resources: [cdk.Fn.importValue("SQSQueueArn")],
      })
    )

    importBucket.grantReadWrite(importFileParserLambdaFunction)

    importBucket.addEventNotification(
      aws_s3.EventType.OBJECT_CREATED,
      new cdk.aws_s3_notifications.LambdaDestination(
        importFileParserLambdaFunction
      ),
      {
        prefix: "uploaded/",
      }
    )

    const importProductsFileLambdaFunction = new lambda.Function(
      this,
      "importProductsFile",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "handlerImportProductsFile.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
          URL_ORIGIN,
        },
      }
    )

    importBucket.grantReadWrite(importProductsFileLambdaFunction)

    const importProductsLambdaIntegration = new apigateway.LambdaIntegration(
      importProductsFileLambdaFunction,
      {
        proxy: false,
        requestTemplates: {
          "application/json": JSON.stringify({
            fileName: "$input.params('fileName')",
          }),
        },
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: corsHeaders,
            responseTemplates,
          },
          {
            statusCode: "400",
            selectionPattern: ".*'statusCode':400.*",
            responseParameters: corsHeaders,
            responseTemplates,
          },
          {
            statusCode: "500",
            selectionPattern: ".*'statusCode':500.*",
            responseParameters: corsHeaders,
            responseTemplates,
          },
        ],
      }
    )

    const basicAuthenticationLambdaArn = cdk.Fn.importValue(
      "basicAuthenticationLambdaArn"
    )

    const basicAuthenticationLambda = lambda.Function.fromFunctionArn(
      this,
      "basicAuthenticationLambda",
      basicAuthenticationLambdaArn
    )

    const lambdaAuthorizer = new apigateway.RequestAuthorizer(
      this,
      "lambdaAuthorizer",
      {
        handler: basicAuthenticationLambda,
        identitySources: [apigateway.IdentitySource.header("Authorization")],
      }
    )

    const api = new apigateway.RestApi(this, "import-api", {
      restApiName: "import API Gateway",
      description:
        "This API serves the Lambda function for creating signed import file url",
    })

    const importResource = api.root.addResource("import")

    importResource.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: corsHeaders,
            responseTemplates: {
              "application/json": "{}",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters,
          },
        ],
      }
    )

    importResource.addMethod("GET", importProductsLambdaIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters,
        },
        {
          statusCode: "400",
          responseParameters,
        },
        {
          statusCode: "500",
          responseParameters,
        },
      ],
      authorizer: lambdaAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    })
  }
}
