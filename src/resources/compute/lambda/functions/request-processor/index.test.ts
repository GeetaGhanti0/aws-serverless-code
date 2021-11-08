import { arrayWith, objectLike, stringLike } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as kms from '@aws-cdk/aws-kms';
import * as s3 from '@aws-cdk/aws-s3';
import * as sqs from '@aws-cdk/aws-sqs';
import { Stack } from '@aws-cdk/core';
import { mockStack } from 'iag-dev-cdk-core';
import { RequestProcessorFunction } from ".";

describe(RequestProcessorFunction, () => {
    let stack: Stack

    beforeAll(() => {
        stack = mockStack()

        const requestKey = new kms.Key(stack, 'RequestKey')

        const responseKey = new kms.Key(stack, 'ResponseKey')

        const letterBucket = new s3.Bucket(stack, 'LetterBucket')

        const requestQueue = new sqs.Queue(stack, 'RequestQueue')

        const responseQueue = new sqs.Queue(stack, 'ResponseQueue')

        new RequestProcessorFunction(stack, {
            requestKey, 
            responseKey, 
            letterBucket, 
            requestQueue, 
            responseQueue
        })

        test('function name is correct', async() => {
            expect(stack).toHaveResource('AWS::Lambda::Function', {
                FunctionName: stringLike('*request-processor')
            })
        })

        test('package type is image', async () => {
            expect(stack).toHaveResource('AWS::Lambda::Function', {
                PackageType: 'Image'
            })
        })

        test('memory size is correct', async () => {
            expect(stack).toHaveResource('AWS::Lambda::Function', {
                MemorySize: 512
            })
        })

        test('time out in seconds', async () => {
            expect(stack).toHaveResource('AWS::Lambda::Function', {
                Timeout : 30
            })
        })

        test('environment name environment variable is set', async () => {
            expect(stack).toHaveResource('AWS::Lambda::Function', {
                Environment : {
                    Variables: {
                        ENVIRONMENT_NAME: 'production'
                    }
                }
            })
        })

        test('response key arn environment variable is set', async () => {
            expect(stack).toHaveResource('AWS::Lambda::Function', {
                Environment : {
                    Variables: {
                        RESPONSE_KEY_ARN: {
                            'Fn::GetAtt': [stringLike('ResponseKey*'), 'Arn']
                        }
                    }
                }
            })
        })

        test('request key arn environment variable is set', async () => {
            expect(stack).toHaveResource('AWS::Lambda::Function', {
                Environment : {
                    Variables: {
                        REQUEST_KEY_ARN: {
                            'Fn::GetAtt': [stringLike('RequestKey*'), 'Arn']
                        }
                    }
                }
            })
        })

        test('Letter Bucket name environment variable is set', async () => {
            expect(stack).toHaveResource('AWS::Lambda::Function', {
                Environment : {
                    Variables: {
                        LETTER_BUCKET_NAME: {
                            Ref: stringLike('LetterBucket*')
                        }
                    }
                }
            })
        })

        test('Response queue environment variable is set', async () => {
            expect(stack).toHaveResource('AWS::Lambda::Function', {
                Environment : {
                    Variables: {
                        RESPONSE_QUEUE_URL: {
                            Ref: stringLike('ResponseQueue*')
                        }
                    }
                }
            })
        })

        test('Permission to encrypt using response KMS is granted', async () => {
            expect(stack).toHaveResource('AWS::IAM::Policy', {
               PolicyDocument:{
                   Statement: arrayWith(
                       objectLike({
                           Action:['kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*'], 
                           Effect: 'Allow', 
                           Resource:{
                               'Fn:GetAtt': [stringLike('ResponseKey*'), 'Arn']
                           }
                       })
                   )
               }
            })
        })

        test('permission to read from letter bucket is granted', async () => {
            expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
              PolicyDocument: {
                Statement: arrayWith(
                  objectLike({
                    Action: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
                    Effect: 'Allow',
                    Resource: [
                      {
                        'Fn::GetAtt': [stringLike('LetterBucket*'), 'Arn']
                      },
                      {
                        'Fn::Join': [
                          '',
                          [
                            {
                              'Fn::GetAtt': [stringLike('LetterBucket*'), 'Arn']
                            },
                            '/*'
                          ]
                        ]
                      }
                    ]
                  })
                )
              }
            })
          })
        test('permission to delete from letter bucket is granted', async () => {
            expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
              PolicyDocument: {
                Statement: arrayWith(
                  objectLike({
                    Action: 's3:DeleteObject*',
                    Effect: 'Allow',
                    Resource: {
                      'Fn::Join': [
                        '',
                        [
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

          
        test('permission to send messages to response queue is granted', async () => {
            expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
              PolicyDocument: {
                Statement: arrayWith(
                  objectLike({
                    Action: [
                      'sqs:SendMessage',
                      'sqs:GetQueueAttributes',
                      'sqs:GetQueueUrl'
                    ],
                    Effect: 'Allow',
                    Resource: {
                      'Fn::GetAtt': [stringLike('ResponseQueue*'), 'Arn']
                    }
                  })
                )
              }
            })
         })
          
      test('sqs event source is configured', async () => {
            expect(stack).toHaveResourceLike('AWS::Lambda::EventSourceMapping', {
              EventSourceArn: {
                'Fn::GetAtt': [stringLike('RequestQueue*'), 'Arn']
              },
              FunctionName: {
                Ref: stringLike('RequestProcessorFunction*')
              },
              BatchSize: 1
            })
      })
    })
})