import { Handler } from "aws-lambda"
import {
  DynamoDBClient,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb"

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION })

const productTableName = process.env.PRODUCT_TABLE_NAME as string
const stockTableName = process.env.STOCK_TABLE_NAME as string

const getProducts = async () => {
  const params = {
    TableName: productTableName,
  }

  const command = new ScanCommand(params)
  const response = await dynamoDB.send(command)

  return response.Items || []
}

const getProductStock = async (productId: string) => {
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

export const main: Handler = async () => {
  try {
    const result = []
    const products = await getProducts()

    for (const product of products) {
      const productId = product.id.S

      if (!productId) {
        continue
      }

      const stock = await getProductStock(productId)

      result.push({
        id: productId,
        title: product.title.S,
        description: product.description.S,
        price: Number(product.price.N),
        count: stock,
      })
    }

    return result
  } catch (error) {
    console.error("Error:", error)
    throw new Error("Error getting list of products")
  }
}
