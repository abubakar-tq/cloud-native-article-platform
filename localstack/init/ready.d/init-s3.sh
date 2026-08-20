#!/bin/sh
awslocal s3 mb "s3://${S3_UPLOADS_BUCKET:-devops-articles-uploads}" || true
