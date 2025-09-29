import { DynamoDBClient } from "@aws-sdk/client-dynamodb"

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION })

export default dynamoDB
