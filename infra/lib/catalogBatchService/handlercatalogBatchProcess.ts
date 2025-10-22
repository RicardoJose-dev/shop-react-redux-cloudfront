import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { SQSRecord, SQSEvent } from "aws-lambda"

const lambdaClient = new LambdaClient({ region: "us-east-1" })
const snsClient = new SNSClient({ region: "us-east-1" })

async function getRecordPromise(record: SQSRecord) {
  try {
    const payload = JSON.parse(record.body)

    const command = new InvokeCommand({
      FunctionName: process.env.CREATE_PRODUCT_LAMBDA_NAME,
      Payload: Buffer.from(JSON.stringify(payload)),
      InvocationType: "RequestResponse",
    })

    await lambdaClient.send(command)

    const snsCommand = new PublishCommand({
      TopicArn: process.env.CREATE_PRODUCT_TOPIC_ARN,
      Subject: "New Product Created",
      Message: JSON.stringify({
        name: payload.name,
        price: payload.price,
      }),
      MessageAttributes: {
        price: {
          DataType: "Number",
          StringValue: payload.price.toString(),
        },
      },
    })

    await snsClient.send(snsCommand)
  } catch (err) {
    console.error("An error ocurred:", record.messageId, err)
  }
}

export async function main(event: SQSEvent) {
  const promises = []
  for (const record of event.Records) {
    promises.push(getRecordPromise(record))
  }

  await Promise.all(promises)
}
