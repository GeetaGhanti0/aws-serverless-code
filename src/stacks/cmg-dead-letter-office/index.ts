import * as cdk from '@aws-cdk/core'
import { cloudFormationStackName } from 'iag-dev-cdk-core'
import { RequestQueue } from '../../resources/application-integration/simple-queue-service/queues/request'
import { ResponseQueue } from '../../resources/application-integration/simple-queue-service/queues/response'
import { RequestDeadLetterQueue } from '../../resources/application-integration/simple-queue-service/queues/request-dead-letter-queue'
import { RequestProcessorFunction } from '../../resources/compute/lambda/functions/request-processor'
import { CmgAwsAccountIdParameter } from '../../resources/management/cmg-aws-account-id'
import { ResponseQueueArnParameter } from '../../resources/management/response-queque-arn'
import { ResponseKeyArnParameter } from '../../resources/management/response-key-arn'
import { RequestKey } from '../../resources/security/key-management-service/customer-managed-keys/request'
import { ResponseKey } from '../../resources/security/key-management-service/customer-managed-keys/response'
import { LetterBucket } from '../../resources/storage/simple-storage-service/buckets/letter'

export class SampleServerlessArchitectureStack extends cdk.Stack{
    constructor(scope: cdk.Construct){
        super(scope, 'SampleServerlessArchitectureStack', {
            stackName: "SampleServerlessArchitectureStack"
        })

        // define CMG AWS account ID parameter
        const cmgAwsAccountIdParameter = CmgAwsAccountIdParameter(this)

        // Define Response key Arn parameter 
        const responseKeyArnParameter = ResponseKeyArnParameter(this)

        //Define Response queue Arn parameter
        const responseQueueArnParameter = ResponseQueueArnParameter(this)

        // define request key
        const requestKey = new RequestKey(this, {
            cmgAwsAccountIdParameter
        })

        // define response key
        const responseKey = ResponseKey(this,{
            responseKeyArnParameter
        })

        // define letter bucket
        const letterBucket = new LetterBucket(this, {
            cmgAwsAccountIdParameter
        })

        // define request dead letter queue
        const requestDeadLetterQueue = new RequestDeadLetterQueue(this)

        //define request queue 
        const requestQueue = new RequestQueue(this, {
            requestDeadLetterQueue, 
            cmgAwsAccountIdParameter
        })

        const responseQueue = ResponseQueue(this, {
            responseQueueArnParameter
        })

        //define request processor function 
        new RequestProcessorFunction(this, {
            requestKey, 
            responseKey, 
            letterBucket, 
            requestQueue, 
            responseQueue
        })
    }


}