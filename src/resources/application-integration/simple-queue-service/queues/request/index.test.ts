import { arrayWith, objectLike, stringLike } from '@aws-cdk/assert'
import '@aws-cdk/assert/jest'
import * as sqs from '@aws-cdk/aws-sqs'
import * as ssm from '@aws-cdk/aws-ssm'
import { Duration, Stack } from '@aws-cdk/core'
import { mockStack } from 'iag-dev-cdk-core'
import RequestQueue from '.'
import { TIMEOUT_IN_SECONDS } from '../../../../compute/lambda/functions/request-processor'

describe(RequestQueue, () => {
    let stack: Stack
    let cmgAwsAccountIdParameter: ssm.StringParameter

beforeAll(() => {
    stack = mockStack()

    const requestDeadLetterQueue = new sqs.Queue(stack, 'requestDeadLetterQueue')

    cmgAwsAccountIdParameter = new ssm.StringParameter(stack, 'cmgAwsAccountIdParameter', {
        stringValue: 'mock-value'
    })

    new RequestQueue(stack, {
    requestDeadLetterQueue,
    cmgAwsAccountIdParameter 

})

test('Queue name is correct', async() => {
    expect(stack).toHaveResourceLike('AWS::SQS::Queue', {
        QueueName: stringLike('*request')
    })
})

test('retention period is 14', async() => {
    expect(stack).toHaveResourceLike('AWS::SQS::Queue', {
        MessageRetentionPeriod: Duration.days(14).toSeconds()
    })
})

test('Visibility Time out is 6 times the lambda Function timeout', async() => {
    expect(stack).toHaveResourceLike('AWS::SQS::Queue', {
        VisibilityTimeout: Duration.seconds(TIMEOUT_IN_SECONDS).toSeconds()
    })
})

test('Delivery Delay is 60 seconds ', async() => {
    expect(stack).toHaveResourceLike('AWS::SQS::Queue', {
        DelaySeconds: Duration.seconds(60).toSeconds()
    })
})

test('Dead Letter Queue is configured ', async() => {
    expect(stack).toHaveResourceLike('AWS::SQS::Queue', {
        RedrivePolicy: {
            deadLetterTargetArn: {
                'Fn:GetAtt': [stringLike('RequestDeadLetterQueue*'), 'Arn']
            }, 
            maxReceiveCount:3
        }
    })
})

test('Queue Policy Grants "CMG" account necessary permisions ', async() => {
    expect(stack).toHaveResourceLike('AWS::SQS::QueuePolicy', {
        PolicyDocument: {
            Statement: arrayWith(
                objectLike({
                    Action: [
                    'sqs:GetQueueAttributes',
                    'sqs:GetQueueUrl',
                    'sqs:SendMessage'
                    ],
                    
                    Effect: 'Allow',
                    Principal: {
                    AWS: {
                    'Fn::Join': [
                    '',
                    [
                    'arn:',  
                    {
                    Ref: 'AWS::Partition'
                    },
                    ':iam::',
                    {
                    'Fn::GetAtt': [
                    stringLike('CmgAwsAccountIdParameter*'),
                    'Value'
                    ]
                    }, 
                    ':root'
                    ]
                    ]
                    }
                    },
                    Resource: {
                    'Fn::GetAtt': [stringLike('RequestQueue*'), 'Arn']
                    }
            }))
            
        }, 
        Resource: {
            'Fn:GetAtt': [stringLike('RequestQueue*'), 'Arn']
        }
    })
})
})
})