import * as lambda from "aws-cdk-lib/aws-lambda"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cdk from "aws-cdk-lib"
import * as path from "path"
import { Construct } from "constructs"

const URL_ORIGIN = "https://dr7vf68s6by3z.cloudfront.net"

const integrationResponses = [
  {
    statusCode: "200",
    responseParameters: {
      "method.response.header.Access-Control-Allow-Origin": `'${URL_ORIGIN}'`,
      "method.response.header.Access-Control-Allow-Methods": "'GET'",
      "method.response.header.Access-Control-Allow-Headers":
        "'Content-Type,Authorization'",
    },
  },
]

const methodResponses = [
  {
    statusCode: "200",
    responseParameters: {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Headers": true,
    },
  },
]

const preFlightOptions = {
  allowOrigins: [URL_ORIGIN],
  allowMethods: ["GET"],
  allowHeaders: ["Content-Type"],
}

export class GetProductsLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const getProductsListLambdaFunction = new lambda.Function(
      this,
      "getProductsList",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "handlerGetProductsList.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      }
    )

    const getProductsByIdLambdaFunction = new lambda.Function(
      this,
      "getProductsById",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "hanlderGetProductsById.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      }
    )

    const api = new apigateway.RestApi(this, "getProducts-api", {
      restApiName: "getProducts API Gateway",
      description: "This API serves the Lambda functions for getProducts",
    })

    const getProductsLambdaIntegration = new apigateway.LambdaIntegration(
      getProductsListLambdaFunction,
      {
        integrationResponses,
        proxy: false,
      }
    )

    const getProductsByIdLambdaIntegration = new apigateway.LambdaIntegration(
      getProductsByIdLambdaFunction,
      {
        requestTemplates: {
          "application/json": `{ "productId": "$input.params('productId')" }`,
        },
        integrationResponses: [
          ...integrationResponses,
          {
            selectionPattern: "^Error.*",
            statusCode: "404",
            responseTemplates: {
              "application/json": JSON.stringify({
                error: "Product not found",
              }),
            },
          },
        ],
        proxy: false,
      }
    )

    const productsResource = api.root.addResource("products")

    productsResource.addMethod("GET", getProductsLambdaIntegration, {
      methodResponses,
    })

    productsResource.addCorsPreflight(preFlightOptions)

    const productByIdResource = productsResource.addResource("{productId}")

    productByIdResource.addMethod("GET", getProductsByIdLambdaIntegration, {
      methodResponses: [
        ...methodResponses,
        {
          statusCode: "404",
          responseParameters: {
            "method.response.header.Content-Type": true,
            "method.response.header.Access-Control-Allow-Origin": true,
            "method.response.header.Access-Control-Allow-Methods": true,
            "method.response.header.Access-Control-Allow-Headers": true,
          },
        },
      ],
    })

    productByIdResource.addCorsPreflight(preFlightOptions)
  }
}
