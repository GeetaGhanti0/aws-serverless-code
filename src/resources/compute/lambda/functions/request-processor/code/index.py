import base64
import json
import logging
import os
import random
import re
import time
from enum import Enum
from subprocess import PIPE, STDOUT, Popen
import aws_encryption_sdk
import boto3
import cv2
import jsonschema
import numpy as np
import pytesseract

# from logger import create_logger

ENVIRONMENT_NAME = os.getenv("ENVIRONMENT_NAME")
LETTER_BUCKET_NAME = os.getenv("LETTER_BUCKET_NAME")
REQUEST_KEY_ARN = os.getenv("REQUEST_KEY_ARN")
RESPONSE_KEY_ARN = os.getenv("RESPONSE_KEY_ARN")
RESPONSE_QUEUE_URL = os.getenv("RESPONSE_QUEUE_URL")

s3_client = boto3.client("s3")
sqs_client = boto3.client("sqs")
encryption_sdk_client = aws_encryption_sdk.EncryptionSDKClient()
encryption_context = {​
   "service": "cmg-return-letters-service",
    "environment": ENVIRONMENT_NAME,
}​

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# class EXECUTION_OUTCOME(Enum):
#     SUCCESS = "Success"
#     BUSINESS_EXCEPTION = "Business Exception"
#     TECHNICAL_EXCEPTION = "Technical Exception"



def handler(event, context):
    # start_time = time.monotonic()
    # # Initialise new logger function
    # logger = create_logger(
    #     default_meta={​
    #         "awsRequestId": context.aws_request_id,
    #         "processIdentifier": "CMG Return Letters",
    #         "processName": "request-processor",
    #     }​
    # )

    # SOB Debug - log bucket name and response queue url

    logger.info("Bucket Name: " + LETTER_BUCKET_NAME)
    logger.info("Response Queue Url: " + RESPONSE_QUEUE_URL)

    # EOB Debug - log bucket name and response queue url
    logger.info("Parsing payload.")

    payload = parse_payload(event)

    # logger.analytics(
    #     "Y",
    #     logger_context={​
    #         "archetype": "CRLL01",
    #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),
    #     }​
    # )

    # SOB Debug - object key
    logger.info("Object Key:  " + payload["correspondence"]["objectKey"])

    # EOB Debug - object key
    logger.info("Validating payload.")

    try:

        validate_payload(payload, "schemas/request.json")

    except Exception as e:

        logger.exception(str(e))
        # logger.analytics(
        #     "Payload is invalid",
        #     logger_context={​
        #         "archetype": "CRLL02",
        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),
        #     }​,
        # )

        send_response(
            payload["metadata"],
            None,
            None,
            [{​"code": "BE001", "message": "Payload is invalid"}​],
            # logger,
            # EXECUTION_OUTCOME.BUSINESS_EXCEPTION,

        )

        delete_letter(payload)

        return

    # SOB Debug - correlation id
    logger.info("correlationId: " + payload["metadata"]["correlationId"])

    # EOB Debug - correlation id
    logger.info("Downloading letter.")

    try:

        encrypted_letter_pdf = s3_client.get_object(
            Bucket=LETTER_BUCKET_NAME,
            Key=payload["correspondence"]["objectKey"],

        )

    except Exception as e:
        logger.exception(str(e))

        # logger.analytics(
        #     "PDF file missing in S3",
        #     logger_context={​
        #         "archetype": "CRLL02",
        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),
        #     }​,
        # )

        send_response(
            payload["metadata"],
            None,
            None,
            [{​"code": "BE002", "message": "PDF file missing in S3"}​],
            # logger,
            # EXECUTION_OUTCOME.BUSINESS_EXCEPTION,
        )

        delete_letter(payload)

        return

    logger.info("Decrypting letter.")

    try:

        letter_pdf = decrypt_letter_pdf(
            encrypted_letter_pdf=encrypted_letter_pdf["Body"].read()

        )

    except Exception as e:
        logger.exception(str(e))
        # logger.analytics(
        #     "Unable to decrypt PDF file",
        #     context={​
        #         "archetype": "CRLLE00",
        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),
        #     }​,
        # )

        send_response(
            payload["metadata"],
            None,
            None,
            [{​"code": "TE001", "message": "Unable to decrypt PDF file"}​],
            # logger,
            # EXECUTION_OUTCOME.TECHNICAL_EXCEPTION,

        )

        delete_letter(payload)
        return

    logger.info("Converting letter format.")
    try:

        letter_image = convert_letter_pdf_to_image(letter_pdf=letter_pdf)

    except Exception as e:

        logger.exception(str(e))
        # logger.analytics(
        #     "Issue encountered while converting PDF to an image",
        #     logger_context={​
        #         "archetype": "CRLLE00",
        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),
        #     }​,
        # )

        send_response(
            payload["metadata"],
            None,
            None,
            [

                {​
                    "code": "TE002",
                    "message": "Issue encountered while converting PDF to an image",

                }​

            ],

            # logger,

            # EXECUTION_OUTCOME.TECHNICAL_EXCEPTION,

        )

        delete_letter(payload)

        return

    # SOB Debug

    s3_client.put_object(
        Bucket=LETTER_BUCKET_NAME,
        Key="converted_image/" + payload["correspondence"]["objectKey"],
        Body=letter_image,

    )

    # EOB Debug

    logger.info("Extracting letter regions of interest.")

    try:
        image, contours = extract_letter_regions_of_interest(
            letter_image=letter_image
        )

    except Exception as e:

        logger.exception(str(e))
        # logger.analytics(
        #     "Unable to extract letter regions of interest.",
        #     logger_context={​
        #         "archetype": "CRLLE00",
        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),
        #     }​,

        # )

        # TODO: Refine this TE

        send_response(
            payload["metadata"],
            None,
            None,
            [
                {​
                    "code": "TE003",
                    "message": "Unable to extract letter regions of interest.",

                }​

            ],

            # logger,

            # EXECUTION_OUTCOME.TECHNICAL_EXCEPTION,

        )

        delete_letter(payload)

        return

    logger.info("Validating contours.")

    try:

        # logger.analytics(

        #     len(contours),

        #     logger_context={​

        #         "archetype": "CRLL0401",

        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),

        #     }​,

        # )

        validate_contours(contours=contours)

    except Exception as e:

        logger.exception(str(e))

        # logger.analytics(

        #     "Unexpected Letter Template - unable to locate address and unique reference number",

        #     logger_context={​

        #         "archetype": "CRLL02",

        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),

        #     }​,

        # )

        send_response(

            payload["metadata"],

            None,

            None,

            [

                {​

                    "code": "BE003",

                    "message": "Unexpected Letter Template - unable to locate address and unique reference number",

                }​

            ],

            # logger,

            # EXECUTION_OUTCOME.BUSINESS_EXCEPTION,

        )

        delete_letter(payload)

        return

    # SOB Debug

    bounding_box_image = cv2.imdecode(

        np.frombuffer(letter_image, np.uint8), cv2.IMREAD_COLOR

    )

    for i in range(len(contours)):

        # Using range like this can error out as contours might not be found.

        # Uncomment below to display the sequence numbering of contours in the letter -  Debug purposes.

        bounding_box_image = cv2.putText(

            bounding_box_image,

            str(i),

            cv2.boundingRect(contours[i])[:2],

            cv2.FONT_HERSHEY_COMPLEX,

            1,

            [125],

        )

        x, y, w, h = cv2.boundingRect(contours[i])

        cv2.rectangle(

            bounding_box_image, (x, y), (x + w, y + h), (0, 255, 0), 2

        )

    bounding_box_image_string = cv2.imencode(".png", bounding_box_image)[

        1

    ].tostring()

    s3_client.put_object(

        Bucket=LETTER_BUCKET_NAME,

        Key="bounding_box_image/" + payload["correspondence"]["objectKey"],

        Body=bounding_box_image_string,

    )

    # EOB Debug

    logger.info("Extracting address and reference number.")

    address, reference_number = extract_address_and_reference_number(

        image=image, contours=contours

    )

    exceptions = []

    if address == None:

        exceptions.append(

            {​

                "code": "BE005",

                "message": "Unable to extract the address",

            }​

        )

        # logger.analytics(

        #     "Issue encountered while extracting the address from the text.",

        #     logger_context={​

        #         "archetype": "CRLL02",

        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),

        #     }​,

        # )

    if reference_number == None:

        exceptions.append(

            {​

                "code": "BE006",

                "message": "Unable to extract unique reference number",

            }​

        )

        # logger.analytics(

        #     "Issue encountered while extracting the unique reference number from text.",

        #     logger_context={​

        #         "archetype": "CRLL02",

        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),

        #     }​,

        # )

    send_response(

        payload["metadata"],

        address,

        reference_number,

        exceptions,

        # logger,

        # EXECUTION_OUTCOME.SUCCESS,

    )

    delete_letter(payload)

    # end_time = time.monotonic()

    # duration = f"{​end_time - start_time:0.4f}​"

    # logger.analytics(

    #     duration,

    #     logger_context={​

    #         "archetype": "CRLL05",

    #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),

    #     }​,

    # )

    return

def validate_contours(contours):

    if len(contours) < 5:

        raise ValueError("contours count is less than 5")

    else:

        return

def delete_letter(payload):

    try:

        s3_client.delete_object(

            Bucket=LETTER_BUCKET_NAME,

            Key=payload["correspondence"]["objectKey"],

        )

    except:

        logger.warn("Failed to delete letter.")

        # logger.analytics(

        #     "Y",

        #     logger_context={​

        #         "archetype": "CRLL0406",

        #         "caseIdentifier": None if payload.get("metadata") == None else payload.get("metadata").get("correlationId", None),

        #     }​,

        # )

def loop_through_contours_for_address_and_reference_number(image, contours):

    address = None

    reference_number = None

    foundAddress = False

    foundReferenceNumber = False

    for i in range(7):

        try:

            x, y, w, h = cv2.boundingRect(contours[i])

            if x > 75 and y > 0:

                logger.info("Finding address region of interest.")

                image_roi = specific_region_of_interest(image, contours[i])

                image_roi = enhance_region_of_interest_image(image_roi)

                logger.info("Running OCR on address image.")

                image_roi_text = pytesseract.image_to_string(

                    image_roi, lang="deu", config="--oem 3"

                )

                # SOB Debug

                logger.info("Image ROI Text" + str(image_roi_text))

                # EOB Debug

        except:

            logger.info("unable to convert image to text")

            continue

        try:

            if address == None:

                address = validate_postcode_extract_address(image_roi_text)

                foundAddress = True

        except:

            address = None

            logger.info("unbale to extract address")

        if reference_number == None:

            try:

                reference_number = extract_reference_number(image_roi_text)

                foundReferenceNumber = True

            except:

                reference_number = None

                logger.info("unbale to extract reference number")

        if foundAddress and foundReferenceNumber == True:

            return address, reference_number

        break

    return address, reference_number

def extract_address_and_reference_number(image, contours):

    try:

        logger.info("Finding address region of interest.")

        address_image = specific_region_of_interest(image, contours[2])

        address_image = enhance_region_of_interest_image(address_image)

        # SOB Debug - save the address_image to S3

        address_image_string = cv2.imencode(".png", address_image)[1].tostring()

        s3_client.put_object(

            Bucket=LETTER_BUCKET_NAME,

            Key="address_image/sample_address_image_{​}​.png".format(

                random.randint(1, 100)

            ),

            Body=address_image_string,

        )

        # EOB Debug - save the address_image to S3

        logger.info("Running OCR on address image.")

        address_text = pytesseract.image_to_string(

            address_image, lang="deu", config="--oem 3"

        )

        # SOB Debug

        logger.info("Address Text" + str(address_text))

        # EOB Debug

        logger.info("Extracting address from address text.")

        address = validate_postcode_extract_address(address_text)

    except:

        logger.info("Unable to extract address.")

        address = None

    try:

        logger.info("Finding reference number region of interest.")

        reference_number_image = specific_region_of_interest(image, contours[4])

        reference_number_image = enhance_region_of_interest_image(

            reference_number_image

        )

        # SOB Debug - save the reference_image to S3

        reference_number_image_string = cv2.imencode(

            ".png", reference_number_image

        )[1].tostring()

        s3_client.put_object(

            Bucket=LETTER_BUCKET_NAME,

            Key="reference_image/sample_reference_image_{​}​.png".format(

                random.randint(1, 100)

            ),

            Body=reference_number_image_string,

        )

        # EOB Debug - save the reference_image to S3

        logger.info("Running OCR on reference number image.")

        reference_number_text = pytesseract.image_to_string(

            reference_number_image, lang="deu", config="--oem 3"

        )

        # SOB Debug

        logger.info("Reference Number Text" + str(reference_number_text))

        # EOB Debug

        logger.info("Extracting reference number from reference number text.")

        reference_number = extract_reference_number(reference_number_text)

    except:

        logger.info("Unable to extract reference number.")

        reference_number = None

    return address, reference_number

def send_response(metadata, address, reference_number, exceptions):

    logger.info("Creating response payload.")

    response_payload = json.dumps(

        {​

            "metadata": metadata,

            "correspondence": {​

                "referenceNumber": reference_number,

                "address": address,

            }​,

            "exceptions": exceptions,

        }​

    )

    # SOB Debug

    logger.info(str(response_payload))

    # EOB Debug

    logger.info("Encrypting response payload.")

    encrypted_response_payload = encrypt_response_payload(

        response_payload=response_payload

    )

    logger.info("Sending response.")

    # logger.analytics(

    #     execution_outcome.value,

    #     logger_context={​

    #         "archetype": "CRLL00",

    #         "caseIdentifier": metadata.get("correlationId", None),

    #     }​,

    # )

    sqs_client.send_message(

        QueueUrl=RESPONSE_QUEUE_URL, MessageBody=encrypted_response_payload

    )

    return

def decrypt_letter_pdf(encrypted_letter_pdf):

    kms_key_provider = aws_encryption_sdk.StrictAwsKmsMasterKeyProvider(

        key_ids=[REQUEST_KEY_ARN]

    )

    decrypted_plaintext, decrypted_header = encryption_sdk_client.decrypt(

        source=encrypted_letter_pdf, key_provider=kms_key_provider

    )

    for key, value in encryption_context.items():

        if decrypted_header.encryption_context[key] != value:

            raise ValueError(

                "Encryption context does not match expected values."

            )

    return decrypted_plaintext

def encrypt_response_payload(response_payload):

    kms_key_provider = aws_encryption_sdk.StrictAwsKmsMasterKeyProvider(

        key_ids=[RESPONSE_KEY_ARN]

    )

    ciphertext, encryptor_header = encryption_sdk_client.encrypt(

        source=response_payload,

        encryption_context=encryption_context,

        key_provider=kms_key_provider,

    )

    return base64.b64encode(ciphertext).decode("utf-8")

def validate_payload(payload, schema_file_path):

    with open(schema_file_path) as schema_file:

        schema = json.load(schema_file)

    try:

        jsonschema.validate(payload, schema)

    except jsonschema.exceptions.ValidationError:

        raise ValueError("Payload is invalid.")

def convert_letter_pdf_to_image(letter_pdf):

    # Convert letter PDF to image using GhostScript

    return Popen(

        [

            "gs",

            "-dSAFER",

            "-dBATCH",

            "-dNOPAUSE",

            "-sDEVICE=png16m",

            "-r300",

            "-dDownScaleFactor=3",

            "-q",

            "-sOutputFile=%stdout",

            "-",

        ],

        stdout=PIPE,

        stdin=PIPE,

        stderr=PIPE,

    ).communicate(input=letter_pdf)[0]

def extract_reference_number(reference_text):

    pattern = "^our\s*reference\s*:{​1}​\s*[0-9]*$"

    try:

        result = re.search(pattern, reference_text.lower(), re.MULTILINE)

        if result:

            referenceNumber = result[0].split(":")[1].strip()

            return referenceNumber

        else:

            raise ValueError

    except ValueError:

        raise ValueError("Unable to extract unique reference number")

def validate_postcode(image_roi_text):

    pattern = "^[A-Za-z]{​1,2}​[0-9][A-Za-z0-9]? ?[0-9][A-Za-z]{​2}​$"

    result = re.search(pattern, image_roi_text, re.MULTILINE)

    if result:

        return True

    else:

        return False

def validate_reference_number(image_roi_text):

    pattern = "^our\s*reference\s*:{​1}​\s*[0-9]*$"

    result = re.search(pattern, image_roi_text.lower(), re.MULTILINE)

    if result:

        return True

    else:

        return False

def validate_postcode_extract_address(address_text):

    pattern = "^[A-Za-z]{​1,2}​[0-9][A-Za-z0-9]? ?[0-9][A-Za-z]{​2}​$"

    result = re.search(pattern, address_text, re.MULTILINE)

    if result:

        return extract_address(address_text, result[0])

    else:

        raise ValueError("Unable to extract address number")

def extract_address(address_text, postcode):

    address = re.split("\n+[\n\f]*", address_text)

    postcodeIndex = address.index(postcode)

    addressDictionary = {​}​

    if address[1] != None:

        for item in address[1:postcodeIndex]:

            addressDictionary["line" + str(address.index(item))] = item

    else:

        addressDictionary["line1"] = None

    addressDictionary["postcode"] = postcode

    return addressDictionary

def extract_letter_regions_of_interest(letter_image):

    # Create OpenCV image from letter image

    image = cv2.imdecode(

        np.frombuffer(letter_image, np.uint8), cv2.IMREAD_COLOR

    )

    # Convert to grayscale

    image_grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Smooth the image to avoid noises

    image_grayscale = cv2.medianBlur(image_grayscale, 5)

    # Apply adaptive threshold

    thresh = cv2.adaptiveThreshold(

        image_grayscale,

        255,

        1,

        1,

        11,

        2,

    )

    # Apply some dilation and erosion to join the gaps - change iteration to detect more or less area's

    thresh = cv2.dilate(thresh, None, iterations=15)

    thresh = cv2.erode(thresh, None, iterations=15)

    # Find contours

    contours, _ = cv2.findContours(

        thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE

    )

    # Sort contours

    def get_contour_precedence(contour, cols):

        tolerance_factor = 10

        origin = cv2.boundingRect(contour)

        return (

            (origin[1] // tolerance_factor) * tolerance_factor

        ) * cols + origin[0]

    contours.sort(

        key=lambda contour: get_contour_precedence(contour, image.shape[1])

    )

    return image, contours

def parse_payload(event):

    payload = json.loads(event["Records"][0]["body"])

    return payload

def specific_region_of_interest(image, contour):

    region_of_interest_margin = 10

    x, y, w, h = cv2.boundingRect(contour)

    specific_region_of_interest = image[

        (y - region_of_interest_margin) : (y - region_of_interest_margin)

        + (h + region_of_interest_margin * 2),

        (x - region_of_interest_margin) : (x - region_of_interest_margin)

        + (w + region_of_interest_margin * 2),

    ]

    #  save the specific_region_of_interest to s3

    return specific_region_of_interest

def enhance_region_of_interest_image(image):

    ocrimg = cv2.resize(

        image, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC

    )  # ocrimg is extracted RoI and #ocrgray is what we send to tesseract change names accordingly

    ocrgray = cv2.cvtColor(ocrimg, cv2.COLOR_BGR2GRAY)

    # ocrgray = cv2.medianBlur(ocrgray, 3)

    kernel = np.ones((1, 1), np.uint8)

    ocrgray = cv2.dilate(ocrgray, kernel, iterations=1)

    ocrgray = cv2.erode(ocrgray, kernel, iterations=1)

    return ocrgray