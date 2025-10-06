import { Stack, StackProps, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"

export const tableName = "Product"

export class ProductStack extends Stack {
  public readonly productsTable: dynamodb.Table

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.productsTable = new dynamodb.Table(this, tableName, {
      tableName,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "price",
        type: dynamodb.AttributeType.NUMBER,
      },
    })

    new CfnOutput(this, "ProductTableArn", {
      value: this.productsTable.tableArn,
      exportName: "ProductTableArn",
    })
  }
}
