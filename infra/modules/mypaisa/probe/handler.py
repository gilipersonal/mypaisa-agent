"""Dev's probe (MA-231): a Lambda with nothing in it but the watching, so the tower is proved live before the real
images land (MA-237). The OpenTelemetry layer wraps it (AWS_LAMBDA_EXEC_WRAPPER), so each call is a trace in X-Ray, a
span in aws/spans and a service in Application Signals. It reads nothing and writes one log line with no content.
Thrown away when the first real function ships.
"""

import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event: dict, context: object) -> dict:
    fail = isinstance(event, dict) and event.get("fail") is True
    logger.info(json.dumps({"message": "probe", "fail": fail, "request_id": getattr(context, "aws_request_id", "")}))
    if fail:
        # A forced error proves the errors alarm and the composite end to end, on purpose only.
        raise RuntimeError("probe: a failure asked for")
    return {"ok": True}
