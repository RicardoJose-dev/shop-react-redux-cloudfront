import * as lambda from "aws-cdk-lib/aws-lambda"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as cdk from "aws-cdk-lib"
import * as path from "path"
import { Construct } from "constructs"
import { tableName as productTableName } from "../models/product/ProductStack"
import { tableName as stockTableNAme } from "../models/stock/StockStack"
import { URL_ORIGIN } from "./utils/constants"

const integrationResponses = [
  {
    statusCode: "200",
    responseParameters: {
      "method.response.header.Access-Control-Allow-Origin": `'${URL_ORIGIN}'`,
      "method.response.header.Access-Control-Allow-Methods": "'POST'",
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

export class CreateProductLambdaStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps,
    productsResource: apigateway.IResource
  ) {
    super(scope, id, props)

    const createProductLambdaFunction = new lambda.Function(
      this,
      "createProduct",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "handlerCreateProduct.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        environment: {
          PRODUCT_TABLE_NAME: productTableName,
          STOCK_TABLE_NAME: stockTableNAme,
        },
      }
    )

    const productsTable = dynamodb.Table.fromTableArn(
      this,
      "ImportedProductTable",
      cdk.Fn.importValue("ProductTableArn")
    )

    const stackTable = dynamodb.Table.fromTableArn(
      this,
      "ImportedStackTable",
      cdk.Fn.importValue("StockTableArn")
    )

    productsTable.grantWriteData(createProductLambdaFunction)
    stackTable.grantWriteData(createProductLambdaFunction)

    const createProductLambdaIntegration = new apigateway.LambdaIntegration(
      createProductLambdaFunction,
      {
        requestTemplates: {
          "application/json": JSON.stringify({
            title: "$input.path('$.title')",
            description: "$input.path('$.description')",
            price: "$input.path('$.price')",
            count: "$input.path('$.count')",
          }),
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

    productsResource.addMethod("POST", createProductLambdaIntegration, {
      methodResponses,
    })
  }
}
