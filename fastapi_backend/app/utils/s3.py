import asyncio
import boto3
from app.core.config import settings
from typing import Optional
import json

s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

def _put_object_sync(key: str, body: bytes) -> None:
    s3_client.put_object(Bucket=settings.S3_BUCKET_NAME, Key=key, Body=body)

def _delete_object_sync(key: str) -> None:
    s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)

async def upload_file_to_s3(file_content: bytes, key: str) -> str:
    await asyncio.to_thread(_put_object_sync, key, file_content)
    return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

async def delete_file_from_s3(url: str) -> bool:
    try:
        key = url.split(f"{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/")[1]
        await asyncio.to_thread(_delete_object_sync, key)
        return True
    except Exception as e:
        raise Exception(f"S3 delete failed: {str(e)}")

def generate_presigned_url(file_path: str, expiry: int = 900) -> str:
    """Generate a presigned URL (default 15-min expiry) from an S3 key or existing URL."""
    try:
        # Extract key if a full URL was stored (legacy behaviour)
        if file_path.startswith("https://"):
            key = file_path.split(".amazonaws.com/", 1)[-1]
        else:
            key = file_path
        return s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET_NAME, "Key": key},
            ExpiresIn=expiry,
        )
    except Exception:
        # Fallback to the raw path so the caller never gets None
        return file_path


async def get_file_from_s3(key: str) -> bytes:
    """Download file from S3"""
    try:
        response = s3_client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        return response['Body'].read()
    except Exception as e:
        raise Exception(f"S3 download failed: {str(e)}")
