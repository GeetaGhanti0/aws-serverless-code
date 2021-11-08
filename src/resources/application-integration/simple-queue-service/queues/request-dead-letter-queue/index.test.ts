import { stringLike } from '@aws-cdk/assert'
import '@aws-cdk/assert/jest'
import { Duration, Stack } from '@aws-cdk/core'
import { mockStack } from 'iag-dev-cdk-core'
import { RequestDeadLetterQueue } from '.'

describe(RequestDeadLetterQueue, ()=> {
    let stack: Stack

    beforeAll(()=> {
        stack = mockStack()
        new RequestDeadLetterQueue(stack)
    })

    test('Queue name is correct', async() => {
        expect(stack).toHaveResourceLike('AWS::SQS::Queue', {
            QueueName: stringLike('*request-dead-letter')
        })
    })
    
    test('retention period is 14', async() => {
        expect(stack).toHaveResourceLike('AWS::SQS::Queue', {
            MessageRetentionPeriod: Duration.days(14).toSeconds()
        })
    })
})