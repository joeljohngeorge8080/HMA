import uuid
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from .config import settings

_client = None


def get_s3_client():
    global _client
    if _client is None:
        _client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
    return _client


def generate_s3_key(employee_id: str, category: str, filename: str) -> str:
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else ''
    unique = uuid.uuid4().hex
    safe_name = filename.replace(' ', '_')
    return f'employees/{employee_id}/{category}/{unique}_{safe_name}'


def generate_presigned_upload_url(key: str, content_type: str, expires: int = 3600) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        'put_object',
        Params={'Bucket': settings.S3_BUCKET_NAME, 'Key': key, 'ContentType': content_type},
        ExpiresIn=expires,
    )


def generate_presigned_download_url(key: str, expires: int = 3600) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.S3_BUCKET_NAME, 'Key': key},
        ExpiresIn=expires,
    )


def delete_object(key: str) -> bool:
    try:
        get_s3_client().delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        return True
    except ClientError:
        return False
