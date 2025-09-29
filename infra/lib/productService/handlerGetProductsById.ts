import { QueryCommand } from "@aws-sdk/client-dynamodb"
import { productTableName } from "./utils/constants"
import dynamoDB from "./utils/dbClient"
import { getProductStock } from "./utils/getProductStock"

const getProductId = async (productId: string) => {
  console.log("productId: ", productId)

  const params = {
    TableName: productTableName,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": { S: productId },
    },
  }

  try {
    const command = new QueryCommand(params)
    const response = await dynamoDB.send(command)

    const productItems = response.Items || []

    if (!productItems.length) {
      throw new Error("Product not found")
    }

    const product = productItems[0]
    const stock = await getProductStock(productId)

    return {
      id: product.id.S,
      title: product.title.S,
      description: product.description.S,
      price: Number(product.price.N),
      count: stock,
    }
  } catch (error) {
    console.error("Failed to retrieve item:", error)
    throw error
  }
}

export async function main(event: any) {
  const productId = event.productId
  return await getProductId(productId)
}
