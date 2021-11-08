import * as ssm from '@aws-cdk/aws-ssm'
import * as cdk from '@aws-cdk/core'
import { ssmParameterName } from 'iag-dev-cdk-core'

export const ResponseKeyArnParameter = (
    scope: cdk.Construct
):ssm.IStringParameter => 
ssm.StringParameter.fromStringParameterAttributes(scope, 'ResponseKeyArnParameter', {
    parameterName:ssmParameterName(scope, 'response-key-arn')
})