#!/usr/bin/env node
/**
 * create-user.js
 *
 * Creates your personal user in the Cognito User Pool using the AWS SDK.
 * Reads credentials from your local AWS config (~/.aws/credentials).
 *
 * Prerequisites:
 *   1. Run `npm run deploy` first (or have cdk-outputs.json)
 *   2. Have AWS credentials configured (`aws configure`)
 *
 * Usage:
 *   node scripts/create-user.js <email> <password>
 *
 * Example:
 *   node scripts/create-user.js daniel@example.com MyPassword123
 */

const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const fs = require("fs");
const path = require("path");

const outputsFile = path.join(__dirname, "..", "cdk-outputs.json");

// ── Read User Pool ID from CDK outputs ─────────────────────────────────────
if (!fs.existsSync(outputsFile)) {
  console.error("❌  cdk-outputs.json not found. Run `npm run deploy` first.");
  process.exit(1);
}

const outputs = JSON.parse(fs.readFileSync(outputsFile, "utf-8"));
const stack = outputs["AgendaStack"];
const userPoolId = stack?.["UserPoolId"];
const region = stack?.["Region"] ?? "eu-west-1";

if (!userPoolId) {
  console.error("❌  UserPoolId not found in cdk-outputs.json.");
  process.exit(1);
}

// ── Parse CLI args ──────────────────────────────────────────────────────────
const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/create-user.js <email> <password>");
  console.error("Example: node scripts/create-user.js daniel@gmail.com MyPass123");
  process.exit(1);
}

// ── Create user ─────────────────────────────────────────────────────────────
const client = new CognitoIdentityProviderClient({ region });

async function main() {
  console.log(`\n📋 Agenda Personal — User Setup`);
  console.log(`   User Pool: ${userPoolId}`);
  console.log(`   Email:     ${email}\n`);

  // Step 1: Create the user (with temp password — suppressed so no email is sent)
  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: password + "_Temp1!", // Temp pw (different from final)
        MessageAction: "SUPPRESS",               // Don't send welcome email
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
      })
    );
    console.log("✅ User created.");
  } catch (err) {
    if (err.name === "UsernameExistsException") {
      console.log("ℹ️  User already exists, setting password...");
    } else {
      console.error("❌ Error creating user:", err.message);
      process.exit(1);
    }
  }

  // Step 2: Set the permanent password directly (skips FORCE_CHANGE_PASSWORD)
  try {
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      })
    );
    console.log("✅ Password set as permanent (no forced reset needed).");
  } catch (err) {
    console.error("❌ Error setting password:", err.message);
    console.error("   Make sure your AWS credentials have cognito-idp:AdminSetUserPassword permission.");
    process.exit(1);
  }

  console.log("\n🎉 Done! You can now log in at /agenda/login with:");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log("\n👉 Make sure your .env.local is populated (run `npm run env` if not).");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
