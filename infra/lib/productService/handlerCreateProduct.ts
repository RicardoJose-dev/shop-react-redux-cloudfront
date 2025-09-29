import { v4 as uuidv4 } from "uuid"
import { TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb"
import { productTableName, stockTableName } from "./utils/constants"
import dynamoDB from "./utils/dbClient"

export async function main(event: any) {
  try {
    console.log(event)
    const { title, description, price, count } = event

    if (!title || !description || !price) {
      throw new Error("one or more paramters missing")
    }

    const productId = uuidv4()

    const params = {
      TransactItems: [
        {
          Put: {
            TableName: productTableName,
            Item: {
              id: { S: productId },
              title: { S: title },
              description: { S: description },
              price: { N: price.toString() },
            },
          },
        },
        {
          Put: {
            TableName: stockTableName,
            Item: {
              product_id: { S: productId },
              count: { N: count.toString() || 0 },
            },
          },
        },
      ],
    }

    const command = new TransactWriteItemsCommand(params as any)
    await dynamoDB.send(command)

    return productId
  } catch (error) {
    console.error("Error creating product and stock items: ", error)
    throw error
  }
}
