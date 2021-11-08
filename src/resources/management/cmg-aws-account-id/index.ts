import * as ssm from '@aws-cdk/aws-ssm'
import * as cdk from '@aws-cdk/core'
import { ssmParameterName } from 'iag-dev-cdk-core'

export const CmgAwsAccountIdParameter = (
    scope: cdk.Construct
):ssm.IStringParameter => 
ssm.StringParameter.fromStringParameterAttributes(scope, 'CmgAwsAccountIdParameter', {
    parameterName:ssmParameterName(scope, 'cmg-aws-account-id')
})