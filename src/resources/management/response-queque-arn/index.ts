import * as ssm from '@aws-cdk/aws-ssm'
import * as cdk from '@aws-cdk/core'
import { ssmParameterName } from 'iag-dev-cdk-core'

export const ResponseQueueArnParameter = (
    scope: cdk.Construct
):ssm.IStringParameter => 
ssm.StringParameter.fromStringParameterAttributes(scope, 'ResponseQueueArnParameter', {
    parameterName:ssmParameterName(scope, 'response-queue-arn')
})