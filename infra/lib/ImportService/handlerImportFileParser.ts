import csvParser from "csv-parser"
import { Readable } from "stream"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import {
  SQSClient,
  GetQueueUrlCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs"

const sqsClient = new SQSClient({ region: "us-east-1" })
const s3Client = new S3Client({ region: "us-east-1" })

const webStreamToNodeStream = (webStream: ReadableStream) => {
  const reader = webStream.getReader()

  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read()
        if (done) {
          this.push(null)
        } else {
          this.push(value)
        }
      } catch (err) {
        this.destroy(err as Error)
      }
    },
  })
}
const getSQSQueue = () => {
  const getUrlCommand = new GetQueueUrlCommand({
    QueueName: process.env.SQS_QUEUE_NAME,
  })
  return sqsClient.send(getUrlCommand)
}

const sendMessageToSQS = async (messageBody: object) => {
  try {
    const sqsQueue = await getSQSQueue()

    const command = new SendMessageCommand({
      QueueUrl: sqsQueue.QueueUrl,
      MessageBody: JSON.stringify(messageBody),
    })

    await sqsClient.send(command)
  } catch (error) {
    console.error("Error sending message to SQS:", error)
  }
}

const processCsvFile = async (bucketName: string, key: string) => {
  const getObject = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  const response = await s3Client.send(getObject)
  const s3Stream = await response.Body

  const nodeStream = webStreamToNodeStream(s3Stream!.transformToWebStream())

  return new Promise((resolve, reject) => {
    nodeStream
      .pipe(csvParser())
      .on("data", async (row) => {
        try {
          await sendMessageToSQS(row)
        } catch (error) {
          console.error("Error processing row:", row, error)
        }
      })
      .on("end", () => {
        console.log("Finished parsing CSV file.")
        resolve(true)
      })
      .on("error", (error) => {
        console.error("Error parsing CSV stream:", error)
        reject(error)
      })
  })
}

export const main = async (event: any) => {
  try {
    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name
      const objectKey = record.s3.object.key

      await processCsvFile(bucketName, objectKey)
    }

    return { statusCode: 200, body: "File(s) processed successfully." }
  } catch (error) {
    console.error("Error processing file:", error)
    throw error
  }
}
