import * as lambda from "aws-cdk-lib/aws-lambda"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cdk from "aws-cdk-lib"
import * as path from "path"
import * as cr from "aws-cdk-lib/custom-resources"
import { Construct } from "constructs"
import { aws_s3, RemovalPolicy } from "aws-cdk-lib"
import { URL_ORIGIN } from "../constants"

const corsHeaders = {
  "method.response.header.Access-Control-Allow-Origin": `'${URL_ORIGIN}'`,
  "method.response.header.Access-Control-Allow-Methods": "'GET'",
  "method.response.header.Access-Control-Allow-Headers":
    "'Content-Type,Authorization'",
}

const responseParameters = {
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

    const api = new apigateway.RestApi(this, "import-api", {
      restApiName: "import API Gateway",
      description:
        "This API serves the Lambda function for creating signed import file url",
    })

    const importResource = api.root.addResource("import")

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
    })
  }
}
