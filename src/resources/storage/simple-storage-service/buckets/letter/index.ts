import * as iam from '@aws-cdk/aws-iam'
import * as s3 from '@aws-cdk/aws-s3'
import { BlockPublicAccess, BucketEncryption } from '@aws-cdk/aws-s3'
import * as ssm from '@aws-cdk/aws-ssm'
import * as cdk from '@aws-cdk/core'
import { s3BucketName } from 'iag-dev-cdk-core'


interface LetterBucketProps {
    cmgAwsAccountIdParameter: ssm.IStringParameter
}

export class LetterBucket extends s3.Bucket {
    constructor(scope: cdk.Construct, props: LetterBucketProps){
        super(scope, 'letterBucket', {
            bucketName: s3BucketName(scope, 'letter'), 
            encryption: BucketEncryption.S3_MANAGED, 
            blockPublicAccess:BlockPublicAccess.BLOCK_ALL, 
            lifecycleRules:[{expiration: cdk.Duration.days(7)}]     
      })

       // Grant 'CMG' Aws Account permission to write objects to bucket

       this.addToResourcePolicy(
           new iam.PolicyStatement({
               principals: [new iam.AccountPrincipal(props.cmgAwsAccountIdParameter.stringValue)], 
               actions:['s3:PutObject', 's3:PutObjectAcl'], 
               resources:[`${this.bucketArn}/*`], 
               conditions: {
                StringEquals: {
                    's3:x-amz-acl': 'bucket-owner-full-control'
                }
               }
           })
       )
    }

   

    

}