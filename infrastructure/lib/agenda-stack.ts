import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

/**
 * AgendaStack — provision ALL AWS infrastructure for the Agenda Personal feature:
 *
 *  1. Cognito User Pool          → Email + password authentication
 *  2. Cognito User Pool Client   → Public app client (no secret) for browser use
 *  3. Cognito Identity Pool      → Exchanges JWT for temporary AWS credentials
 *  4. IAM Authenticated Role     → Least-privilege DynamoDB access for logged-in users
 *  5. DynamoDB Tables (x4)       → agenda-shopping | agenda-tasks | agenda-library | agenda-links
 *
 * Always Free Tier:
 *  - DynamoDB PAY_PER_REQUEST: always free ≤ 25 GB + 200M req/month
 *  - Cognito: free ≤ 50,000 MAU
 *
 * After `cdk deploy --outputs-file cdk-outputs.json`, run `npm run env`
 * to auto-populate `.env.local` in the portfolio root.
 */
export class AgendaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Cognito User Pool
    // ──────────────────────────────────────────────────────────────────────────

    const userPool = new cognito.UserPool(this, "AgendaUserPool", {
      userPoolName: "agenda-user-pool",
      selfSignUpEnabled: false,           // Admin-only registration (only you)
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep user data on stack updates
    });

    // 2. User Pool Client — public client (no secret) used directly from browser
    const userPoolClient = userPool.addClient("AgendaWebClient", {
      userPoolClientName: "agenda-web-client",
      authFlows: {
        userPassword: true,              // USER_PASSWORD_AUTH — used by SDK login
        userSrp: false,
      },
      generateSecret: false,             // Required: false for browser-side clients
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3. DynamoDB Tables — PAY_PER_REQUEST = Always Free Tier
    // ──────────────────────────────────────────────────────────────────────────

    const tableConfig: Partial<dynamodb.TableProps> = {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Protect data; destroy manually if needed
    };

    const shoppingTable = new dynamodb.Table(this, "ShoppingTable", {
      ...(tableConfig as dynamodb.TableProps),
      tableName: "agenda-shopping",
      partitionKey: { name: "itemId", type: dynamodb.AttributeType.STRING },
    });

    const tasksTable = new dynamodb.Table(this, "TasksTable", {
      ...(tableConfig as dynamodb.TableProps),
      tableName: "agenda-tasks",
      partitionKey: { name: "taskId", type: dynamodb.AttributeType.STRING },
    });

    const libraryTable = new dynamodb.Table(this, "LibraryTable", {
      ...(tableConfig as dynamodb.TableProps),
      tableName: "agenda-library",
      partitionKey: { name: "entryId", type: dynamodb.AttributeType.STRING },
    });

    const linksTable = new dynamodb.Table(this, "LinksTable", {
      ...(tableConfig as dynamodb.TableProps),
      tableName: "agenda-links",
      partitionKey: { name: "linkId", type: dynamodb.AttributeType.STRING },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Cognito Identity Pool (CfnIdentityPool — stable L1 construct)
    //    Exchanges the Cognito User Pool JWT for temporary STS credentials
    //    so the browser can call DynamoDB directly.
    // ──────────────────────────────────────────────────────────────────────────

    const identityPool = new cognito.CfnIdentityPool(this, "AgendaIdentityPool", {
      identityPoolName: "agenda_identity_pool",
      allowUnauthenticatedIdentities: false, // Authenticated users only
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
          serverSideTokenCheck: false,
        },
      ],
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 5. IAM Role for authenticated users
    //    Least-privilege: only the exact DynamoDB actions needed by the app
    // ──────────────────────────────────────────────────────────────────────────

    const authenticatedRole = new iam.Role(this, "AgendaAuthenticatedRole", {
      roleName: "agenda-cognito-authenticated",
      description: "Assumed by authenticated Agenda users via Cognito Identity Pool",
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // Grant read+write on all 4 agenda tables
    for (const table of [shoppingTable, tasksTable, libraryTable, linksTable]) {
      table.grantReadWriteData(authenticatedRole);
    }

    // Attach the IAM role to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, "AgendaIdentityPoolRoles", {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 6. CloudFormation Outputs
    //    Written to cdk-outputs.json by `cdk deploy --outputs-file cdk-outputs.json`
    //    Then auto-populated to .env.local via `npm run env`
    // ──────────────────────────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      exportName: "AgendaUserPoolId",
      description: "→ NEXT_PUBLIC_COGNITO_USER_POOL_ID",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      exportName: "AgendaUserPoolClientId",
      description: "→ NEXT_PUBLIC_COGNITO_CLIENT_ID",
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: identityPool.ref,
      exportName: "AgendaIdentityPoolId",
      description: "→ NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID",
    });

    new cdk.CfnOutput(this, "Region", {
      value: this.region,
      exportName: "AgendaRegion",
      description: "→ NEXT_PUBLIC_AWS_REGION",
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 7. Resource tags
    // ──────────────────────────────────────────────────────────────────────────

    cdk.Tags.of(this).add("Project", "AgendaPersonal");
    cdk.Tags.of(this).add("Owner", "DanielIbanezBetes");
    cdk.Tags.of(this).add("Environment", "Production");
  }
}
