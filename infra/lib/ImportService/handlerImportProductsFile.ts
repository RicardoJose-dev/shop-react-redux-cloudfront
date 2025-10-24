import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({ region: "us-east-1" })

const generateSignedURL = async (objectKey: string) => {
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: objectKey,
  })

  return await getSignedUrl(s3Client, command, { expiresIn: 300 })
}

export const main = async (event: any) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": process.env.URL_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: null,
    }
  }

  try {
    const { fileName } = event

    if (!fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "no filename provided" }),
      }
    }

    const objectKey = `uploaded/${fileName}`

    const signedUrl = await generateSignedURL(objectKey)

    return {
      statusCode: 200,
      body: JSON.stringify({
        signedUrl,
      }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: "Error while generating the signed URL",
    }
  }
}
