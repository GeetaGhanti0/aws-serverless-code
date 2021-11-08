import '@aws-cdk/assert/jest'
import * as iam from '@aws-cdk/aws-iam'
import { IStringParameter } from '@aws-cdk/aws-ssm'
import { Stack } from '@aws-cdk/core'
import { mockStack, ssmParameterName } from 'iag-dev-cdk-core'
import { ResponseQueueArnParameter } from '.'

describe(ResponseQueueArnParameter, () => {
    let stack: Stack
    let parameter: IStringParameter
    let parameterName: string

    beforeAll(()=> {
        stack = mockStack()

        parameter = ResponseQueueArnParameter(stack)

        parameterName = ssmParameterName(stack, 'response-queue-arn')
    })

    test('parameter name is correct', async () => {
        expect(parameter).toHaveProperty('parameterName', parameterName)
    })

    test('parameter type is string', async () => {
        expect(parameter).toHaveProperty('parameterType', String)
    })

    test('Imported parameter works', async () => {
        const role = new iam.Role(stack, 'test-role', {
            assumedBy: new iam.AccountRootPrincipal()
        })
        parameter.grantRead(role)

        expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Actions: [
                        'ssm:DescribeParameters', 
                        'ssm:GetParameters', 
                        'ssm:GetParameter', 
                        'ssm:GetParameterHistory'
                    ], 
                    Effect: 'Allow', 
                    Resource: {
                        'Fn::Join': [
                            '', [
                                'arn:', {
                                    Ref: 'AWS::Partition'
                                }, 
                                `:ssm:mock-region:mock-account:parameter${parameterName}`
                            ]
                        ]
                    }
                    }
                ]
            }
        })
    })
})
