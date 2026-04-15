import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";

export class PortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = "danielibabet.com";
    const wwwDomainName = `www.${domainName}`;

    // 0. Búsqueda automática de la Zona Alojada de Route 53
    const zone = route53.HostedZone.fromLookup(this, "PortfolioZone", {
      domainName: domainName,
    });

    // 1. S3 Bucket (Private, solo CloudFront puede leer)
    const siteBucket = new s3.Bucket(this, "PortfolioBucket", {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. Certificado ACM (100% automático porque le inyectamos la 'zone')
    const certificate = new acm.Certificate(this, "PortfolioCertificate", {
      domainName: domainName,
      subjectAlternativeNames: [wwwDomainName],
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // 3. Función CloudFront en el borde (Edge) para reescribir URLs y simular el servidor de Next.js
    // Convierte /agenda a /agenda.html antes de que S3 lo busque, permitiendo rutas anidadas.
    const routerFunction = new cloudfront.Function(this, "NextJsRouterFunction", {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '.html';
  }

  return request;
}
      `),
    });

    // 4. CloudFront Distribution (usando el nuevo Origin Access Control)
    const distribution = new cloudfront.Distribution(this, "PortfolioDistribution", {
      defaultRootObject: "index.html",
      certificate: certificate,
      domainNames: [domainName, wwwDomainName],
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" }, 
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" }
      ],
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        functionAssociations: [{
          function: routerFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
    });

    // 4. Enlaces automáticos de DNS (Registros A y AAAA)
    new route53.ARecord(this, "AliasRecord", {
      zone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new route53.ARecord(this, "WwwAliasRecord", {
      zone,
      recordName: wwwDomainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // Soporte IPv6 (AaaaRecord)
    new route53.AaaaRecord(this, "AaaaAliasRecord", {
      zone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new route53.AaaaRecord(this, "WwwAaaaAliasRecord", {
      zone,
      recordName: wwwDomainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // 5. S3 Deployment (Sube la compilación final)
    new s3deploy.BucketDeployment(this, "DeployPortfolioAssets", {
      sources: [s3deploy.Source.asset("../out")],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"], // Invalida caché antiguo siempre que redespliegues
    });

  }
}
