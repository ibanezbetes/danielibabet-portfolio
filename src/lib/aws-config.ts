/**
 * AWS Configuration Constants
 * Values are loaded from NEXT_PUBLIC_* environment variables.
 * These are intentionally public — security is enforced via IAM policies
 * on the Cognito Identity Pool's authenticated role.
 */

export const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION ?? "eu-west-1",

  cognito: {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
    identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID ?? "",
  },

  googleCalendar: {
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY ?? "",
    calendarId: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID ?? "primary",
  },
} as const;

/** DynamoDB table names */
export const TABLES = {
  SHOPPING: "agenda-shopping",
  TASKS: "agenda-tasks",
  LIBRARY: "agenda-library",
  LINKS: "agenda-links",
  SHIFT_TYPES: "agenda-shift-types",
  SHIFT_ENTRIES: "agenda-shift-entries",
} as const;
