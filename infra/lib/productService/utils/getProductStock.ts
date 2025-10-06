import { QueryCommand } from "@aws-sdk/client-dynamodb"
import dynamoDB from "./dbClient"
import { stockTableName } from "./constants"

export const getProductStock = async (productId: string) => {
  const params = {
    TableName: stockTableName,
    KeyConditionExpression: "product_id = :productId",
    ExpressionAttributeValues: {
      ":productId": { S: productId },
    },
  }

  const command = new QueryCommand(params)
  const response = await dynamoDB.send(command)

  return Number(response.Items?.[0]?.count?.N) || 0
}
