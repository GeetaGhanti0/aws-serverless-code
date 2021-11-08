import '@aws-cdk/assert/jest'
import { IQueue } from '@aws-cdk/aws-sqs'
import * as ssm from '@aws-cdk/aws-ssm'
import { IStringParameter } from '@aws-cdk/aws-ssm' 
import { Stack } from '@aws-cdk/core'
import { mockStack } from 'iag-dev-cdk-core'
import { ResponseQueue } from '.'

describe(ResponseQueue, () => {
    let stack: Stack
    let responseQueueArnParameter: IStringParameter
    let responseQueue: IQueue

    beforeAll(()=> {
        stack = mockStack()

        responseQueueArnParameter = new ssm.StringParameter(
            stack, 
            'ResponseQueueArnParameter', 
            {
                stringValue: 'mock-value'
            }
        )

        responseQueue = ResponseQueue(stack, {
            responseQueueArnParameter
        })

        test('queue arn is correct', async() => {
            expect(responseQueue).toHaveProperty(
                'queueArn', 
                responseQueueArnParameter.stringValue
            )
        })
    })
})