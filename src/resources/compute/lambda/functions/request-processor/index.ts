import * as kms from '@aws-cdk/aws-kms'
import * as lambda from '@aws-cdk/aws-lambda'
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources'
import * as s3 from '@aws-cdk/aws-s3'
import * as sqs from '@aws-cdk/aws-sqs'
import * as cdk from '@aws-cdk/core'
import { lambdaFunctionName } from 'iag-dev-cdk-core'
import * as path from 'path'

export const TIMEOUT_IN_SECONDS = 30

interface RequestProcessorFunctionProps {
    requestKey: kms.Key
    responseKey: kms.IKey
    letterBucket: s3.Bucket
    requestQueue: sqs.Queue
    responseQueue: sqs.IQueue
}

export class RequestProcessorFunction extends lambda.DockerImageFunction{
    constructor(scope:cdk.Construct, props:RequestProcessorFunctionProps) {
        super(scope, 'RequestProcessorFunction', {
            functionName: lambdaFunctionName(scope, 'request-processor'), 
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, 'code')),
            memorySize: 512, 
            timeout: cdk.Duration.seconds(TIMEOUT_IN_SECONDS), 
            environment:{
                ENVIRONMENT_NAME: scope.node.tryGetContext('environmentName'), 
                REQUEST_KEY_ARN: props.requestKey.keyArn, 
                RESPONSE_KEY_ARN: props.responseKey.keyArn, 
                LETTER_BUCKET_NAME: props.letterBucket.bucketName, 
                RESPONSE_QUEUE_URL: props.responseQueue.queueUrl
            }
        })

        // Grant Request Processor function to decrypt using request key
        props.requestKey.grantDecrypt(this)

        // Grant request Processor function to encrypt using the response key
        props.responseKey.grantEncrypt(this)

        //Grant Request Processsor function permission to read and delete from letter bucket
        props.letterBucket.grantRead(this)
        props.letterBucket.grantDelete(this)

        //Grant Request Processsor function permission to write to letter bucket
        props.letterBucket.grantWrite(this)

        //grant request processor function permission to send messages to response queue
        props.responseQueue.grantSendMessages(this)

        //Define request queue as an event source for request processor function
        this.addEventSource(
            new SqsEventSource(props.requestQueue, {
                batchSize: 1 // Batch Size cannot me more than 1 without the additional handler error handling
            })
        )

    }
}