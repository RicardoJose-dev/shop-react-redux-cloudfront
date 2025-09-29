import { Stack, StackProps, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"

export const tableName = "Stock"

export class StockStack extends Stack {
  public readonly stockTable: dynamodb.Table

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.stockTable = new dynamodb.Table(this, tableName, {
      tableName,
      partitionKey: {
        name: "product_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "count",
        type: dynamodb.AttributeType.NUMBER,
      },
    })

    new CfnOutput(this, "StockTableArn", {
      value: this.stockTable.tableArn,
      exportName: "StockTableArn",
    })
  }
}
