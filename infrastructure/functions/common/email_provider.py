from common.aws_clients import ses_client
from common.config import required

MESSAGE_PURPOSES = {
    "contact-acknowledgement",
    "contact-enquiry",
    "waitlist-confirmation",
    "waitlist-confirmed",
}


def send_email(
    sender: str,
    recipient: str,
    subject: str,
    text: str,
    html: str,
    reply_to: str = "",
    *,
    message_purpose: str,
) -> None:
    if message_purpose not in MESSAGE_PURPOSES:
        raise ValueError("Unsupported email message purpose")
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
        "ConfigurationSetName": required("SES_CONFIGURATION_SET"),
        "EmailTags": [{"Name": "message-purpose", "Value": message_purpose}],
    }
    if reply_to:
        request["ReplyToAddresses"] = [reply_to]
    ses_client().send_email(**request)
