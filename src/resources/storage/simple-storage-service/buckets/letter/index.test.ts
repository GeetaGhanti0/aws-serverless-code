import { arrayWith, objectLike, stringLike } from "@aws-cdk/assert";
import '@aws-cdk/assert/jest';
import * as ssm from '@aws-cdk/aws-ssm';
import { Stack } from '@aws-cdk/core';
import { mockStack } from 'iag-dev-cdk-core';
import { LetterBucket } from './';

describe (LetterBucket, () => {
    let stack: Stack
    let cmgAwsAccountIdParameter: ssm.IStringParameter

    beforeAll(() => {
        stack = mockStack()

        cmgAwsAccountIdParameter = new ssm.StringParameter(stack, 'cmgAwsAccountIdParameter', {
            stringValue: 'mock-value'
        })

        new LetterBucket(stack, {
            cmgAwsAccountIdParameter
        })

        test('bucket name is correct', async () => {
            expect(stack).toHaveResource('AWS::S3::Bucket', {
                BucketName: stringLike('*letter')
            })
        })

        test('bucket has public access blcoked ', async () => {
            expect(stack).toHaveResource('AWS::S3::Bucket', {
                PublicAccessBlockconfiguration:{
                    BlockPublicAcls: true, 
                    BlockPublicPolicy: true, 
                    IgnorePublicAcls: true, 
                    RestrictedPublicBuckets: true
                }
            })
        })

        test('bucket has server side encryption enabled  ', async () => {
            expect(stack).toHaveResource('AWS::S3::Bucket', {
                BucketEncryption:{
                    ServerSideEncryptionConfigured: [{
                        ServerSideEncryptionByDefault: {
                            SSEAlgorithm: 'AES256'
                        }
                    }]                   
                }
            })
        })

        test('Bucket has 7 days expiration lifecycle policy configured  ', async () => {
            expect(stack).toHaveResource('AWS::S3::Bucket', {
               LifecycleConfiguration: {
                   Rules: [
                       {
                           ExpirationInDays: 7, 
                           Status: 'Enabled'
                       }
                   ]
               }
            })
        })

        test('Bucket Polict grants CMG AWS account necessary permissions  ', async () => {
            expect(stack).toHaveResource('AWS::S3::BucketPolicy', {
              PolicyDocument: {
                  Statement: arrayWith(
                      objectLike({
                          Action: [
                              's3:PutObject', 
                              's3:PutObjectAcl'
                            ], 
                          Condition: {
                              StringEquals: {
                                  's3:x-amz-acl': 'bucket-owner-full-control'
                              }
                          }, 
                          Effect: 'Allow', 
                          Principal: {
                              AWS: {

                                'Fn::Join': [
                                    '', [
                                        'arn:', {
                                            Ref: 'AWS::Partition'
                                        }, 
                                        ':iam::', {
                                            'Fn::GetAtt': [
                                                stringLike('cmgAwsAccountIdParameter*'), 
                                                'Value'
                                            ]
                                        }, 
                                        ':root'
                                    ]
                                ]
                              }
                          }, 
                          Resource: {
                              'Fn::Join': [
                                  '', [
                                      {
                                          'Fn::GetAtt': [stringLike('LetterBucket*'), 'Arn']
                                      }, 
                                      '/*'
                                  ]
                              ]
                          }
                        })
                    
                    )
                }
            })
        })
    })
})
