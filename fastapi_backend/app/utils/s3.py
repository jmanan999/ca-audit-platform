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

async def upload_file_to_s3(file_content: bytes, key: str) -> str:
    """Upload file to S3 and return the URL"""
    try:
        s3_client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=key,
            Body=file_content
        )
        
        # Generate URL
        url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        return url
    except Exception as e:
        raise Exception(f"S3 upload failed: {str(e)}")

async def delete_file_from_s3(url: str) -> bool:
    """Delete file from S3"""
    try:
        # Extract key from URL
        key = url.split(f"{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/")[1]
        s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        return True
    except Exception as e:
        raise Exception(f"S3 delete failed: {str(e)}")

async def get_file_from_s3(key: str) -> bytes:
    """Download file from S3"""
    try:
        response = s3_client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        return response['Body'].read()
    except Exception as e:
        raise Exception(f"S3 download failed: {str(e)}")
