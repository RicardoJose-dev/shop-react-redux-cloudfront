import dotenv from "dotenv"
import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from "aws-lambda"

const generatePolicy = (
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string,
  context: Record<string, any> = {}
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  }
}

const getCredentials = (authHeader: string) => {
  const base64Credentials = authHeader.split(" ")[1]
  const creadentials = Buffer.from(base64Credentials, "base64").toString("utf8")

  return creadentials.split(":")
}

export const main = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  dotenv.config()

  try {
    const authHeader =
      event.headers?.authorization || event.headers?.Authorization

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      console.log("Error getting authHeader")
      return generatePolicy("unauthorized", "Deny", event.methodArn, {
        statusCode: 401,
        message: "Unauthorized: Missing or invalid Authorization header.",
      })
    }

    const [userName, password] = getCredentials(authHeader)

    if (!userName || !password) {
      console.log("no userName or password")
      return generatePolicy("unauthorized", "Deny", event.methodArn, {
        statusCode: 403,
        message: "Forbidden: Invalid credentials.",
      })
    }

    if (
      userName !== process.env.ACCOUNT_NAME &&
      password !== process.env.ACCOUNT_PASSWORD
    ) {
      console.log(`username or password dont match`)
      return generatePolicy("unauthorized", "Deny", event.methodArn, {
        statusCode: 403,
        message: "Forbidden: Invalid credentials.",
      })
    }

    return generatePolicy("AuthenticatedUser", "Allow", event.methodArn)
  } catch (err) {
    console.log("an Error", err)
    return generatePolicy("InternalError", "Deny", event.methodArn, {
      statusCode: 500,
      message: "Unable to authenticate the user",
    })
  }
}
