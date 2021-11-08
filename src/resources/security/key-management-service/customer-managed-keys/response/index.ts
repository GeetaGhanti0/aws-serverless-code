import * as kms from '@aws-cdk/aws-kms'
import * as ssm from '@aws-cdk/aws-ssm'
import * as cdk from '@aws-cdk/core'

interface ResponseKeyProps{
    responseKeyArnParameter: ssm.IStringParameter
}

export const ResponseKey = (scope: cdk.Construct, props:ResponseKeyProps): kms.IKey => 
    kms.Key.fromKeyArn(scope, 'Responsekey', props.responseKeyArnParameter.stringValue)

