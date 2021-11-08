import * as sqs from '@aws-cdk/aws-sqs'
import * as cdk from '@aws-cdk/core'
import { Duration } from '@aws-cdk/core'
import { sqsQueueName } from 'iag-dev-cdk-core'

const CONSTRUCT_ID = 'RequestDeadLetterQueue'

export class RequestDeadLetterQueue extends sqs.Queue {
    constructor(scope: cdk.Construct){
        super(scope, CONSTRUCT_ID, {
            queueName: sqsQueueName(scope, 'request-dead-letter'), 
            retentionPeriod:Duration.days(14)
        })
    }
}