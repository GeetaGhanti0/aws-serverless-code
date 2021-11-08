import '@aws-cdk/assert/jest'
import { IKey } from '@aws-cdk/aws-kms'
import * as ssm from '@aws-cdk/aws-ssm'
import { IStringParameter } from '@aws-cdk/aws-ssm'
import { Stack } from '@aws-cdk/core'
import { mockStack } from 'iag-dev-cdk-core'
import { ResponseKey } from '.'

describe(ResponseKey , () => {
let stack: Stack
let responseKeyArnParameter: IStringParameter
let responseKey : IKey

beforeAll(() => {
    stack = mockStack()

    responseKeyArnParameter = new ssm.StringParameter(stack, 'ResponsekeyArnparameter', {
        stringValue: 'mock-value'
    })

    responseKey = ResponseKey(stack, {
        responseKeyArnParameter
    })
})
test('key arn is correct', async () => {
    expect(responseKey).toHaveProperty(
        'keyArn', 
        responseKeyArnParameter.stringValue
    )
})
})