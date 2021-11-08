import { stringLike } from '@aws-cdk/assert'
import '@aws-cdk/assert/jest'
import { Stack } from "@aws-cdk/core"
import { mockApp } from 'iag-dev-cdk-core'
import { SampleServerlessArchitectureStack } from "."

describe(SampleServerlessArchitectureStack,() => {
    let stack: Stack

    beforeAll(() => {
        const app = mockApp()
        stack = new SampleServerlessArchitectureStack(app)
    })

    test('request key is definied', async () => {
        expect(stack).toHaveResource('AWS::KMS::Alias', {
            AliasName: stringLike('*request')
        })
    })

    test('letter bucket is declared', async () => {
        expect(stack).toHaveResource('AWS::S3::Bucket', {
            BucketName: stringLike('*letter')
        })
    })

    test('dead Letter queue is definied', async () => {
        expect(stack).toHaveResourceLike('AWS::SQS::Queue', {
            QueueName: stringLike('*request-dead-letter')
        })
    })

    test('queue is definied', async () => {
        expect(stack).toHaveResourceLike('AWS::SQS::Queue', {
            QueueName: stringLike('*request')
        })
    })
   
    test('request processor function is definied', async () => {
        expect(stack).toHaveResource('AWS::Lambda::Function', {
            BucketName: stringLike('*request-processor')
        })
    })

})