import * as iam from '@aws-cdk/aws-iam'
import * as sqs from '@aws-cdk/aws-sqs'
import * as ssm from '@aws-cdk/aws-ssm'
import * as cdk from '@aws-cdk/core'

import {Duration} from '@aws-cdk/core'
import {sqsQueueName} from 'iag-dev-cdk-core'
import {TIMEOUT_IN_SECONDS} from '../../../../compute/lambda/functions/request-processor'

interface RequestQueueProps{
    requestDeadLetterQueue: sqs.Queue
    cmgAwsAccountIdParameter:ssm.IStringParameter
}

export class RequestQueue extends sqs.Queue{
    constructor(scope: cdk.Construct, props: RequestQueueProps){
        super(scope, 'RequestQueue', {
            queueName: sqsQueueName(scope, 'request'), 
            retentionPeriod: Duration.days(14), 
            visibilityTimeout: Duration.seconds(TIMEOUT_IN_SECONDS*6), 
            deliveryDelay: Duration.seconds(60), 
            deadLetterQueue: {
                queue: props.requestDeadLetterQueue,
                maxReceiveCount: 3
            }
        })

        //Grant CMG AWS Account Permission to send message to queue
        this.addToResourcePolicy(
            new iam.PolicyStatement({
                principals:[
                    new iam.AccountPrincipal(props.cmgAwsAccountIdParameter.stringValue)
                ], 
                actions:[
                    'sqs:GetQueueAttributes', 
                    'sqs:GetQueueUrl',
                    'sqs:SendMessage'
                ], 
                resources: [this.queueArn]
            })
        )
    }
}