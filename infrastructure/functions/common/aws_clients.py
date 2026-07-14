def table(name: str):
    import boto3
    return boto3.resource("dynamodb").Table(name)


def ses_client():
    import boto3
    return boto3.client("sesv2")
