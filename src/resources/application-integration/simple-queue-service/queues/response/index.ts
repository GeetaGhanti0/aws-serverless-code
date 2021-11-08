import * as sqs from '@aws-cdk/aws-sqs'
import * as ssm from '@aws-cdk/aws-ssm'
import * as cdk from '@aws-cdk/core'

interface ResponseQueueProps {
    responseQueueArnParameter: ssm.IStringParameter
}

export const ResponseQueue = (
    scope: cdk.Construct, 
    props: ResponseQueueProps
    ): sqs.IQueue => sqs.Queue.fromQueueArn(
        scope, 
        'ResponseQueue', 
        props.responseQueueArnParameter.stringValue
    )
