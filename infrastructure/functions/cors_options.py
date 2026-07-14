from common.http import options_response


def handler(event, _context):
    return options_response(event)
