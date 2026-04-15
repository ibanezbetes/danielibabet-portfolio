import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { awsConfig } from "./aws-config";

/**
 * Creates a DynamoDBDocumentClient authenticated via Cognito Identity Pool.
 *
 * Flow:
 * 1. User authenticates against Cognito User Pool → receives idToken
 * 2. idToken is exchanged with Identity Pool → AWS grants temporary STS credentials
 * 3. Those credentials are used to sign DynamoDB requests
 *
 * @param idToken - The Cognito User Pool JWT idToken from the authenticated session
 */
export function createDynamoDBClient(idToken: string): DynamoDBDocumentClient {
  const cognitoIdentityClient = new CognitoIdentityClient({
    region: awsConfig.region,
  });

  const providerKey = `cognito-idp.${awsConfig.region}.amazonaws.com/${awsConfig.cognito.userPoolId}`;

  const dynamoDBClient = new DynamoDBClient({
    region: awsConfig.region,
    credentials: fromCognitoIdentityPool({
      client: cognitoIdentityClient as any,
      identityPoolId: awsConfig.cognito.identityPoolId,
      logins: {
        [providerKey]: idToken,
      },
    }),
  });

  return DynamoDBDocumentClient.from(dynamoDBClient, {
    marshallOptions: {
      // Omit undefined values when marshalling to DynamoDB
      removeUndefinedValues: true,
    },
  });
}
