# pyright: basic, reportTypedDictNotRequiredAccess=false
"""moto as DynamoDB, S3 and SQS. No credentials exist here: the clients carry a dummy pair and a loopback endpoint."""

from dataclasses import dataclass
from typing import TYPE_CHECKING

import boto3
from moto.server import ThreadedMotoServer

from local import config

if TYPE_CHECKING:
    from mypy_boto3_dynamodb import DynamoDBClient
    from mypy_boto3_s3 import S3Client
    from mypy_boto3_sqs import SQSClient


KEY = "local"  # moto takes any pair; this is never a credential


@dataclass(frozen=True)
class Stack:
    """What the local app and its workers talk to."""

    endpoint: str
    dynamodb: DynamoDBClient
    sqs: SQSClient
    s3: S3Client
    updates_url: str
    outbox_url: str
    work_url: str


def start_moto(port: int = config.MOTO_PORT) -> ThreadedMotoServer:
    server = ThreadedMotoServer(ip_address=config.HOST, port=port, verbose=False)
    server.start()
    return server


def connect(endpoint: str) -> Stack:
    """Clients for moto, and the table, bucket and queues the real stack has, under `mypaisa-local-` names."""
    config.require_loopback(endpoint)
    dynamodb = boto3.client(
        "dynamodb", endpoint_url=endpoint, region_name=config.REGION, aws_access_key_id=KEY, aws_secret_access_key=KEY
    )
    sqs = boto3.client(
        "sqs", endpoint_url=endpoint, region_name=config.REGION, aws_access_key_id=KEY, aws_secret_access_key=KEY
    )
    s3 = boto3.client(
        "s3", endpoint_url=endpoint, region_name=config.REGION, aws_access_key_id=KEY, aws_secret_access_key=KEY
    )
    dynamodb.create_table(
        TableName=config.TABLE,
        BillingMode="PAY_PER_REQUEST",
        KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk", "KeyType": "RANGE"}],
        AttributeDefinitions=[
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "sk", "AttributeType": "S"},
        ],
    )
    s3.create_bucket(Bucket=config.BUCKET)
    return Stack(
        endpoint=endpoint,
        dynamodb=dynamodb,
        sqs=sqs,
        s3=s3,
        updates_url=sqs.create_queue(QueueName=config.UPDATES_QUEUE, Attributes={"FifoQueue": "true"})["QueueUrl"],
        outbox_url=sqs.create_queue(QueueName=config.OUTBOX_QUEUE, Attributes={"FifoQueue": "true"})["QueueUrl"],
        work_url=sqs.create_queue(QueueName=config.WORK_QUEUE)["QueueUrl"],
    )
