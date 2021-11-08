import * as iam from '@aws-cdk/aws-iam'
import * as kms from '@aws-cdk/aws-kms'
import * as ssm from '@aws-cdk/aws-ssm'
import * as cdk from '@aws-cdk/core'
import { kmsKeyAlias } from 'iag-dev-cdk-core'

interface RequestKeyProps{
    cmgAwsAccountIdParameter: ssm.IStringParameter
}

export class RequestKey extends kms.Key {
    constructor(scope:cdk.Construct, props:RequestKeyProps){
        super(scope, 'RequestKey', {
            alias: kmsKeyAlias(scope, 'request'),
            enableKeyRotation: true
        })

        // grant "CMG" AWS account permission to use key
    this.addToResourcePolicy(
        new iam.PolicyStatement({
            principals:[
                new iam.AccountPrincipal(props.cmgAwsAccountIdParameter.stringValue)
            ], 
            actions:[
                'kms:Encrypt', 
                'kms:ReEncrypt*', 
                'kms:GenerateDataKey*', 
                'kms:DescribeKey'
            ], 
            resources:['*']
        })
    )
    }
}