import { Handler } from "aws-lambda"
import { ScanCommand } from "@aws-sdk/client-dynamodb"
import dynamoDB from "./utils/dbClient"
import { productTableName } from "./utils/constants"
import { getProductStock } from "./utils/getProductStock"

const getProducts = async () => {
  const params = {
    TableName: productTableName,
  }

  const command = new ScanCommand(params)
  const response = await dynamoDB.send(command)

  return response.Items || []
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
