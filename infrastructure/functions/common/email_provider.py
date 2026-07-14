from common.aws_clients import ses_client


def send_email(sender: str, recipient: str, subject: str, text: str, html: str, reply_to: str = "") -> None:
    request = {
        "FromEmailAddress": sender,
        "Destination": {"ToAddresses": [recipient]},
        "Content": {
            "Simple": {
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": text, "Charset": "UTF-8"},
                    "Html": {"Data": html, "Charset": "UTF-8"},
                },
            }
        },
    }
    if reply_to:
        request["ReplyToAddresses"] = [reply_to]
    ses_client().send_email(**request)
