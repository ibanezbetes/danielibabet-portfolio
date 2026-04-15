#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AgendaStack } from "../lib/agenda-stack";
import { PortfolioStack } from "../lib/portfolio-stack";

const app = new cdk.App();

new AgendaStack(app, "AgendaStack", {
  env: {
    // Usa eu-west-1 (Irlanda) — siempre en la capa Always Free
    region: "eu-west-1",
    // La cuenta se toma de las credenciales AWS configuradas localmente
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  description: "Agenda Personal — Cognito + DynamoDB (Always Free Tier)",
});

new PortfolioStack(app, "PortfolioStack", {
  env: {
    // CloudFront custom certificates must definitively reside in us-east-1
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  description: "Portfolio Static Hosting — CloudFront CDN + S3 Website (Always Free Tier)",
});
