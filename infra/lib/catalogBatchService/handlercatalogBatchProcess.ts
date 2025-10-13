import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { SQSRecord, SQSEvent } from "aws-lambda"

const lambdaClient = new LambdaClient({ region: "us-east-1" })

async function getRecordPromise(record: SQSRecord) {
  try {
    const payload = JSON.parse(record.body)

    const command = new InvokeCommand({
      FunctionName: process.env.CREATE_PRODUCT_LAMBDA_NAME,
      Payload: Buffer.from(JSON.stringify(payload)),
      InvocationType: "RequestResponse",
    })

    return lambdaClient
      .send(command)
      .then((response) => {
        console.log("Lambda invoked successfully:", record.messageId, response)
      })
      .catch((err) => {
        console.error(
          "Lambda invocation failed for record:",
          record.messageId,
          err
        )
      })
  } catch (err) {
    console.error("Error processing SQS message:", record.messageId, err)
  }
}

export async function main(event: SQSEvent) {
  const promises = []
  for (const record of event.Records) {
    promises.push(getRecordPromise(record))
  }

  await Promise.all(promises)
}
