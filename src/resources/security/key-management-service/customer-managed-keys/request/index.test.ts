import { arrayWith, objectLike, stringLike } from "@aws-cdk/assert";
import '@aws-cdk/assert/jest';
import * as ssm from '@aws-cdk/aws-ssm';
import { Stack } from '@aws-cdk/core';
import { mockStack } from 'iag-dev-cdk-core';
import { RequestKey } from '.';

describe(RequestKey, () => {
    let stack: Stack
    let cmgAwsAccountIdParameter: ssm.IStringParameter

    beforeAll(() => {
        stack = mockStack()

        cmgAwsAccountIdParameter = new ssm.StringParameter(
            stack, 
            'CmgAwsAccountIdParameter', 
            {
                stringValue: 'mock-value'
            }
        )

        new RequestKey(stack, {
            cmgAwsAccountIdParameter
        })
    })

    test("key alias name is correct", async () => {
        expect(stack).toHaveResource('AWS::KMS::Alias', {
            AliasName: stringLike('*request')
        })
    })

    test("key alias target name is correct", async () => {
        expect(stack).toHaveResource('AWS::KMS::Alias', {
            TargetKeyId: {
                'Fn:GetAtt': [stringLike('RequestKey*'), 'Arn']
            }
        })
    })

    test("key rotation is enabled", async () => {
        expect(stack).toHaveResource('AWS::KMS::Key', {
            EnableKeyRotation: true
        })
    })

    test('Key resource Policy grants "CMG" AWS account permission to use key', async()=> {
        expect(stack).toHaveResourceLike('AWS::KMS::Key', {
            KeyPolicy: {
                Statement: arrayWith(
                    objectLike({
                        Action:[
                            'kms:Encrypt', 
                            'kms:ReEncrypt',
                            'kms:GenerateDataKey*', 
                            'kms:DescribeKey'
                        ], 
                        Effect: 'Allow', 
                        Principle: {
                            AWS: {
                                'Fn:Join': [
                                    '', 
                                    [
                                        'arn:', 
                                        {
                                            Ref: 'AWS::Partition'
                                        }, 
                                        ':iam::',
                                        {
                                            'Fn:GetAtt':
                                            [
                                                stringLike('cmgAwsAccountIdParameter*'), 
                                                'Value'
                                            ]
                                        }, 
                                        ':root'
                                    ]
                                ]
                            }
                        },
                        Resource:'*'
                    })
                )
                
            }
        })
    })

})