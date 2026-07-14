from html import escape
from urllib.parse import quote


def waitlist_confirmation(site_url: str, token: str, support_email: str) -> tuple[str, str, str]:
    confirmation_url = f"{site_url.rstrip('/')}/waitlist/confirm?token={quote(token, safe='')}"
    subject = "Confirm your Job Seeker Copilot waiting-list email"
    text = (
        "Confirm your email to join the Job Seeker Copilot waiting list:\n\n"
        f"{confirmation_url}\n\nThis link expires for your protection. "
        f"If you did not request this, ignore this message or contact {support_email}.\n"
        f"Privacy: {site_url.rstrip('/')}/privacy\nContact: {site_url.rstrip('/')}/contact"
    )
    html = _frame(
        "Confirm your email",
        "One quick step remains before you join the Job Seeker Copilot waiting list.",
        confirmation_url,
        "Confirm my email",
        f"This link expires for your protection. If you did not request this, ignore this email or contact {escape(support_email)}. "
        f'<a href="{escape(site_url.rstrip("/") + "/privacy", quote=True)}">Privacy</a> · '
        f'<a href="{escape(site_url.rstrip("/") + "/contact", quote=True)}">Contact</a>',
    )
    return subject, text, html


def waitlist_confirmed(site_url: str, unsubscribe_token: str, support_email: str) -> tuple[str, str, str]:
    unsubscribe_url = f"{site_url.rstrip('/')}/waitlist/unsubscribe?token={quote(unsubscribe_token, safe='')}"
    subject = "You’re on the Job Seeker Copilot waiting list"
    text = (
        "Thanks for confirming your email. We will send only important availability and early-access updates.\n\n"
        f"Unsubscribe at any time: {unsubscribe_url}\nSupport: {support_email}"
    )
    html = _frame(
        "You’re on the list",
        "Thanks for confirming. We’ll send only important Job Seeker Copilot availability and early-access updates.",
        site_url,
        "Visit Job Seeker Copilot",
        f'<a href="{escape(unsubscribe_url, quote=True)}">Unsubscribe</a> at any time · {escape(support_email)}',
    )
    return subject, text, html


def contact_owner(
    name: str,
    email: str,
    subject_value: str,
    message: str,
    created_at: str = "",
    request_id: str = "",
    source: str = "landing-page",
) -> tuple[str, str, str]:
    subject = f"Landing-page enquiry: {subject_value}"[:200]
    text = (
        f"Name: {name}\nEmail: {email}\nSubject: {subject_value}\n"
        f"Received: {created_at}\nRequest ID: {request_id}\nSource: {source}\n\n{message}"
    )
    html = (
        '<div style="font-family:Arial,sans-serif;max-width:680px">'
        '<h1 style="font-size:22px">Landing-page enquiry</h1>'
        f"<p><strong>Name:</strong> {escape(name)}<br>"
        f"<strong>Email:</strong> {escape(email)}<br>"
        f"<strong>Subject:</strong> {escape(subject_value)}<br>"
        f"<strong>Received:</strong> {escape(created_at)}<br>"
        f"<strong>Request ID:</strong> {escape(request_id)}<br>"
        f"<strong>Source:</strong> {escape(source)}</p>"
        f'<div style="white-space:pre-wrap;border-top:1px solid #dbe3ec;padding-top:16px">{escape(message)}</div>'
        "</div>"
    )
    return subject, text, html


def contact_acknowledgement(name: str, support_email: str, site_url: str) -> tuple[str, str, str]:
    subject = "We received your Job Seeker Copilot enquiry"
    text = (
        f"Hello {name},\n\nThanks for getting in touch. We received your enquiry.\n\n"
        f"Support: {support_email}\nPrivacy: {site_url.rstrip('/')}/privacy"
    )
    html = _frame(
        "Thanks for getting in touch",
        f"Hello {escape(name)}, we received your Job Seeker Copilot enquiry.",
        "",
        "",
        f"If you need to add anything, contact {escape(support_email)}. "
        f'<a href="{escape(site_url.rstrip("/") + "/privacy", quote=True)}">Privacy</a>.',
    )
    return subject, text, html


def unsubscribe_confirmation(site_url: str, support_email: str) -> tuple[str, str, str]:
    subject = "Your Job Seeker Copilot subscription was updated"
    text = (
        "You have been removed from the Job Seeker Copilot waiting list. "
        f"You can join again at {site_url}. Questions: {support_email}"
    )
    html = _frame(
        "You’ve been unsubscribed",
        "You will not receive further Job Seeker Copilot waiting-list updates.",
        site_url,
        "Visit Job Seeker Copilot",
        f"Questions? Contact {escape(support_email)}.",
    )
    return subject, text, html


def _frame(heading: str, intro: str, url: str, button: str, footer: str) -> str:
    action = ""
    if url and button:
        action = (
            f'<p style="margin:28px 0"><a href="{escape(url, quote=True)}" '
            'style="background:#2767e8;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">'
            f"{escape(button)}</a></p>"
        )
    return (
        '<div style="font-family:Arial,sans-serif;max-width:620px;color:#172033">'
        f'<h1 style="font-size:26px">{escape(heading)}</h1><p>{intro}</p>{action}'
        f'<p style="color:#64748b;font-size:13px">{footer}</p></div>'
    )
