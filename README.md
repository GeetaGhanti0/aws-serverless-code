# CMG Dead Letter Office Service

A service that processes dead letter office (DLO) letters from Child Maintenance Group (CMG), utilising computer vision and OCR to extract and return relevant document information.

---

## Prerequisites

## Prerequisites

- Make sure you have [Node.js](https://nodejs.org/) installed. The current Long Term Support (LTS) release at version 14.17.5 is recommended.
- Make sure you have [AWS security credentials](https://docs.aws.amazon.com/general/latest/gr/aws-security-credentials.html) configured.

## Dependencies

### AWS Resources

The service has AWS resources it depends upon which are not created by the CDK deployment process, so they must be created prior to deployment.

#### AWS Systems Manager Parameter Store Parameters

String: `/iag/cdlo/<env>/cmg-aws-account-id`
: The "CMG" AWS account ID.
String: `/iag/cdlo/<env>/response-key-arn`
: The response key ARN.
String: `/iag/cdlo/<env>/response-queue-arn`
: The response queue ARN.

---

## Installation

Run the following script to install the required Node Package Manager (NPM) dependencies.

``` shell
npm install
```

---
The project is written in TypeScript, however Node.js cannot run TypeScript directly. Run the following script to convert the TypeScript into JavaScript using the TypeScript compiler.

```shell
npm run build
```

---

## Bootstrapping

The first time you deploy an AWS CDK app into an environment, you'll need to install a "bootstrap stack". This stack includes resources that are needed for CDK to operate. For example, the stack includes an S3 bucket that is used to store templates and assets during the deployment process. Run the following script to install the bootstrap stack.

```shell
npm run cdk bootstrap
```

---

## Synth

You can use the `cdk synth` NPM script to synthesize and print the CloudFormation template for the stack.

### Development

Set the `APP_ENV` environment variable to **development** to configure the project to use development naming conventions and resources.

```shell
APP_ENV=development npm run cdk synth
```

### Production

By default, the project is configured to use production naming conventions and resources.

```shell
npm run cdk synth
```

---

## Diff

You can use the `cdk diff` NPM script to compare the stack defined in your app with the already-deployed stack, and display a list of any differences.

### Development

Set the `APP_ENV` environment variable to **development** to configure the project to use development naming conventions and resources.

```shell
APP_ENV=development npm run cdk diff
```

### Production

By default, the project is configured to use production naming conventions and resources.

```shell
npm run cdk diff
```

---

## Deployment

You can use the `deploy` NPM script to deploy the application to an AWS account. Your IAM user must have the required permissions to execute all of the underlying AWS CloudFormation API calls which are run as part of the CDK deployment process.

### Development

Set the `APP_ENV` environment variable to **development** to configure the project to use development naming conventions and resources.

```shell
APP_ENV=development npm run cdk deploy
```

### Production

By default, the project is configured to use production naming conventions and resources.

```shell
npm run cdk deploy
```

---

## Maintenance

### Re-drive Dead Letter Queue Messages

To re-drive SQS messages from the dead letter queue back to the original queue, you can make use of the [replay-aws-dlq](https://www.npmjs.com/package/replay-aws-dlq) NPM package.

```shell
npx replay-aws-dlq [deadLetterQueueUrl] [originalQueueUrl]
```

If required, you can use the `AWS_PROFILE` environment variable to specify a particular AWS profile.

```shell
AWS_PROFILE=development npx replay-aws-dlq {deadLetterQueueUrl] [originalQueueUrl]
```

---

## [Contributing](CONTRIBUTING.md)