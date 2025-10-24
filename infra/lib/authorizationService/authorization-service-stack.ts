import * as lambda from "aws-cdk-lib/aws-lambda"
import * as cdk from "aws-cdk-lib"
import * as path from "path"
import * as iam from "aws-cdk-lib/aws-iam"
import { Construct } from "constructs"

export class AuthorizerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const lambdaRole = new iam.Role(this, "LambdaAuthorizerRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    })

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    )

    const basicAuthenticationLambda = new lambda.Function(
      this,
      "lambda-authorizer",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "handlerBasicAuthorizer.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        role: lambdaRole,
      }
    )

    basicAuthenticationLambda.grantInvoke(
      new iam.ServicePrincipal("apigateway.amazonaws.com")
    )

    new cdk.CfnOutput(this, "basicAuthenticationLambdaArn", {
      value: basicAuthenticationLambda.functionArn,
      exportName: "basicAuthenticationLambdaArn",
    })
  }
}
