"""Build the MyPaisa Agent AWS architecture document (Lucid Standard Import JSON), one page per view."""
import json, sys

NAVY = "#13213A"; CORAL = "#C2381F"; CRIMSON = "#B5123F"; BLUE = "#2453C9"; AMBER = "#8A5300"
GREY = "#646A78"; GREEN = "#1D7A3E"; PURPLE = "#6B3FB8"
F_HOME = "#F6F4F1"; F_OUT = "#FCEED6"; F_NOTE = "#FFFFFF"; F_P12 = "#EEE7FA"; F_FAIL = "#FCE4EA"; F_AWS = "#FBFAF8"

L = {  # AWS 2024 class names
    "lambda": "ArchAWSLambdaAWS2024", "sqs": "ArchAmazonSimpleQueueServiceAWS2024", "queue": "ResAmazonSimpleQueueServiceQueueAWS2024",
    "sns": "ArchAmazonSimpleNotificationServiceAWS2024", "email": "ResAmazonSimpleNotificationServiceEmailNotificationAWS2024",
    "apigw": "ArchAmazonAPIGatewayAWS2024", "cf": "ArchAmazonCloudFrontAWS2024", "s3": "ArchAmazonSimpleStorageServiceAWS2024",
    "ddb": "ArchAmazonDynamoDBAWS2024", "cognito": "ArchAmazonCognitoAWS2024", "r53": "ArchAmazonRoute53AWS2024",
    "acm": "ArchAWSCertificateManagerAWS2024", "iam": "ArchAWSIdentityandAccessManagementAWS2024", "role": "ResAWSIdentityAccessManagementRoleAWS2024",
    "sts": "ResAWSIdentityAccessManagementAWSSTSAWS2024", "ecr": "ArchAmazonElasticContainerRegistryAWS2024",
    "cw": "ArchAmazonCloudWatchAWS2024", "ssm": "ResAWSSystemsManagerParameterStoreAWS2024", "sched": "ResAmazonEventBridgeSchedulerAWS2024",
    "eb": "ArchAmazonEventBridgeAWS2024", "bus": "ResAmazonEventBridgeCustomEventBusAWS2024", "sfn": "ArchAWSStepFunctionsAWS2024",
    "budgets": "ArchAWSBudgetsAWS2024", "ce": "ArchAWSCostExplorerAWS2024", "trail": "ArchAWSCloudTrailAWS2024",
    "cloud": "AWSCloudAWS2024", "account": "AWSAccountAWS2024", "region": "RegionAWS2024", "group": "GenericGroupAWS2024",
    "sfnwf": "AWSStepFunctionsWorkflowAWS2024",
}


class Page:
    def __init__(self, pid, title, heading, sub):
        self.pid, self.title = pid, title
        self.shapes, self.lines, self.n = [], [], 0
        self.text("t_" + pid, 40, 30, 2000, 90,
                  f'<div style="font-size:9pt;text-align:left"><p style="text-align:left"><span style="font-size:18pt"><b>{heading}</b></span></p><p style="text-align:left">{sub}</p></div>')

    def text(self, sid, x, y, w, h, html):
        self.shapes.append({"id": sid, "type": "text", "boundingBox": {"x": x, "y": y, "w": w, "h": h}, "text": html})

    def box(self, sid, x, y, w, h, txt, fill=F_NOTE, stroke=GREY, dashed=False, size=9, tc=None, align="center"):
        s = {"id": sid, "type": "rectangle", "boundingBox": {"x": x, "y": y, "w": w, "h": h},
             "text": f'<p style="font-size:{size}pt;text-align:{align}">{txt}</p>',
             "style": {"fill": {"type": "color", "color": fill}, "stroke": {"color": stroke, "width": 2, "style": "dashed" if dashed else "solid"}}}
        if tc: s["style"]["textColor"] = tc
        import re, math
        plain = re.sub(r"<(?!br)[^>]+>", "", txt).replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
        n = sum(max(1, math.ceil(len(ln) * 9.5 / (w - 24))) for ln in plain.split("<br>"))
        need = 20 + n * 24
        if need > h: print(f"FIT {self.pid}:{sid} w={w} h={h} need={need}")
        self.shapes.append(s)

    def cont(self, sid, x, y, w, h, title, fill=F_AWS, stroke=GREY, dashed=False):
        self.shapes.append({"id": sid, "type": "rectangleContainer", "boundingBox": {"x": x, "y": y, "w": w, "h": h},
                            "containerTitle": {"text": title}, "assistedLayout": False,
                            "style": {"fill": {"type": "color", "color": fill},
                                      "stroke": {"color": stroke, "width": 2, "style": "dashed" if dashed else "solid"}}})

    def group(self, sid, cls, x, y, w, h, txt):
        self.shapes.append({"id": sid, "type": "namedContainer", "className": L[cls], "boundingBox": {"x": x, "y": y, "w": w, "h": h},
                            "text": f'<p style="font-size:9pt;text-align:left"><b>{txt}</b></p>'})

    def icon(self, sid, cls, x, y, txt, size=90):
        self.shapes.append({"id": sid, "type": "namedShape", "className": L[cls], "boundingBox": {"x": x, "y": y, "w": size, "h": size},
                            "text": txt.replace("<br>", "\n").replace("&lt;", "‹").replace("&gt;", "›")})

    def line(self, a, b, label=None, color=CORAL, dashed=False, pa=None, pb=None, both=False, kind="straight", lpos=0.5, side="top"):
        self.n += 1
        e1 = {"type": "shapeEndpoint", "style": "arrow" if both else "none", "shapeId": a}
        e2 = {"type": "shapeEndpoint", "style": "arrow", "shapeId": b}
        if pa and pb:
            e1["position"] = {"x": pa[0], "y": pa[1]}; e2["position"] = {"x": pb[0], "y": pb[1]}
        ln = {"id": f"{self.pid}_l{self.n}", "lineType": kind, "endpoint1": e1, "endpoint2": e2,
              "stroke": {"color": color, "width": 2, "style": "dashed" if dashed else "solid"}}
        if label:
            ln["text"] = [{"text": label, "position": lpos, "side": side}]
        self.lines.append(ln)

    def out(self):
        return {"id": self.pid, "title": self.title, "shapes": self.shapes, "lines": self.lines}


B, R, T, Lf = (0.5, 1), (1, 0.5), (0.5, 0), (0, 0.5)   # bottom, right, top, left anchors
pages = []

# ---------------------------------------------------------------- 1 overview
p = Page("p1", "1 System overview", "MyPaisa Agent · system overview",
         "prod in us-east-1; dev is the same shape with -dev names · design only, 24 Oct 2026 · coral = chat and data · blue = sign-in and the web app · crimson dashed = failure path")
p.cont("home", 40, 200, 360, 1280, "Household", F_HOME, NAVY)
p.box("h_tg", 70, 230, 300, 120, "<b>Telegram app</b><br>chat, buttons, files<br>second check: Face ID or PIN")
p.box("h_mem", 70, 410, 300, 120, "<b>Members</b><br>owner (admin) · member · viewer<br>joined by a one-time invite")
p.box("h_mini", 70, 640, 300, 110, "<b>Mini App</b> in Telegram<br>console.mypaisapp.com · read-only")
p.box("h_web", 70, 800, 300, 130, "<b>Laptop browser</b><br>console.mypaisapp.com<br>signs in through Cognito:<br>Telegram · Google · passkey")
p.box("h_mail", 70, 1230, 300, 120, "<b>Admin's email</b><br>system alerts through SNS<br>1,000 a month free")
p.box("tgapi", 1000, 160, 420, 100, "<b>Telegram Bot API</b><br>webhook in · messages out", F_OUT, AMBER)
p.box("o_claude", 1515, 160, 340, 100, "<b>Anthropic API</b> · Haiku · Sonnet<br>$200 credit: $160 prod · $40 dev", F_OUT, AMBER)
p.group("cloud", "cloud", 440, 320, 1760, 1160, "AWS account 545595341442 · Terraform only · prod deployed by CI")
p.group("region", "region", 480, 380, 1680, 1060, "us-east-1 · mypaisa-prod-* (dev: mypaisa-dev-*)")
YA, YB, YC, YD = 460, 720, 980, 1240
p.icon("r53", "r53", 540, YA, "Route 53<br>mypaisapp.com zone")
p.icon("acm", "acm", 740, YA, "ACM<br>*.mypaisapp.com")
p.icon("apigw", "apigw", 1100, YA, "API Gateway<br>api.mypaisapp.com")
p.icon("hook", "lambda", 1280, YA, "webhook λ<br>secret check")
p.icon("qin", "sqs", 1460, YA, "SQS updates.fifo<br>lane per member")
p.icon("agent", "lambda", 1640, YA, "agent λ<br>Claude tool loop")
p.icon("qout", "sqs", 1820, YA, "SQS outbox.fifo<br>lane per chat")
p.icon("send", "lambda", 2000, YA, "sender λ<br>Telegram limits")
p.icon("cf", "cf", 560, YB, "CloudFront<br>console.mypaisapp.com")
p.icon("s3web", "s3", 780, YB, "S3<br>static web app")
p.icon("cog", "cognito", 1000, YB, "Cognito (Essentials)<br>auth.mypaisapp.com")
p.icon("trig", "lambda", 1200, YB, "Cognito triggers λ<br>Telegram HMAC")
p.icon("api", "lambda", 1420, YB, "api λ · /v1<br>read-only JSON<br>admin actions")
p.icon("ecr", "ecr", 1640, YB, "ECR<br>one arm64 image")
p.icon("iam", "iam", 1840, YB, "IAM<br>role per function")
p.icon("sched", "sched", 560, YC, "EventBridge Scheduler<br>Europe/London")
p.icon("qwork", "sqs", 780, YC, "SQS work<br>background jobs")
p.icon("worker", "lambda", 1000, YC, "worker λ<br>ingest · news · docs<br>engine · briefs")
p.icon("sfn", "sfn", 1220, YC, "Step Functions<br>daily run (phase 12)")
p.icon("bus", "bus", 1440, YC, "EventBridge bus<br>agent team (phase 12)")
p.icon("lake", "s3", 1660, YC, "S3 lake<br>Parquet · DuckDB")
p.icon("ddb", "ddb", 1880, YC, "DynamoDB<br>registry · audit · state")
p.icon("sns", "sns", 560, YD, "SNS admin-alerts<br>email · alert router")
p.icon("cw", "cw", 780, YD, "CloudWatch + X-Ray<br>logs · alarms")
p.icon("dlq", "queue", 1000, YD, "dead-letter queues<br>kept 14 days")
p.icon("ssm", "ssm", 1440, YD, "SSM Parameter Store<br>keys, set by hand")
p.icon("budg", "budgets", 1660, YD, "AWS Budgets<br>£75 backstop")
p.icon("ce", "ce", 1880, YD, "Cost Explorer<br>daily AWS meter")
p.cont("out", 2240, 380, 360, 1000, "Outside AWS", F_OUT, AMBER)
p.box("o_data", 2270, 440, 300, 170, "<b>Free data first</b><br>yfinance · Twelve Data free<br>FRED · BoE · ECB · EIA<br>GDELT · RSS<br>EODHD only on approval")
p.box("o_google", 2270, 680, 300, 100, "<b>Google</b><br>OAuth client per environment")
p.box("o_gh", 2270, 850, 300, 150, "<b>GitHub Actions</b><br>OIDC, no AWS keys<br>gates · plan · build once<br>dev, then prod on approval")
p.box("o_jira", 2270, 1070, 300, 100, "<b>Jira MA</b><br>every change traced")
p.line("h_tg", "tgapi", "chat", color=AMBER, both=True, pa=R, pb=Lf, lpos=0.5)
p.line("tgapi", "apigw", "POST /telegram/webhook", pa=((1145 - 1000) / 420, 1), pb=T, lpos=0.15)
p.line("apigw", "hook", "", pa=R, pb=Lf)
p.line("hook", "qin", "", pa=R, pb=Lf)
p.line("qin", "agent", "", pa=R, pb=Lf)
p.line("agent", "qout", "", pa=R, pb=Lf)
p.line("qout", "send", "", pa=R, pb=Lf)
p.line("send", "tgapi", "sendMessage", pa=T, pb=(0.85, 0), kind="elbow", lpos=0.5)
p.line("agent", "o_claude", "messages", color=AMBER, pa=T, pb=((1685 - 1515) / 340, 1), lpos=0.5)
p.line("h_mini", "cf", "", color=BLUE, pa=R, pb=(0, 0.3))
p.line("h_web", "cf", "", color=BLUE, pa=R, pb=(0, 0.8))
p.line("cf", "s3web", "", color=BLUE, pa=R, pb=Lf)
p.line("cog", "trig", "", color=BLUE, pa=R, pb=Lf)
p.line("apigw", "api", "/v1 · cookie", color=BLUE, pa=(1, 0.85), pb=T, lpos=0.75)
p.line("sched", "qwork", "", pa=R, pb=Lf)
p.line("qwork", "worker", "", pa=R, pb=Lf)
p.line("dlq", "cw", "", color=CRIMSON, dashed=True, pa=Lf, pb=R)
p.line("cw", "sns", "", color=CRIMSON, dashed=True, pa=Lf, pb=R)
p.line("sns", "h_mail", "", color=CRIMSON, dashed=True, pa=Lf, pb=R)
pages.append(p)


# ---------------------------------------------------------------- 2 environments and delivery
p = Page("p2", "2 Environments and delivery", "Environments, domains and delivery",
         "one AWS account, every component twice · Terraform only, applied by CI · prod after Arun's approval · MA-26, MA-107, MA-108, MA-106")
p.cont("dev_laptop", 40, 170, 360, 520, "Developer laptop", F_HOME, NAVY)
p.box("lap1", 70, 230, 300, 120, "<b>Local run against dev</b><br>dev bot by long polling<br>console on localhost → api-dev")
p.box("lap2", 70, 400, 300, 110, "<b>Developer role</b><br>works in dev · explicit deny<br>on anything tagged env=prod")
p.box("lap3", 70, 560, 300, 100, "<b>AWS MCP</b><br>reads only · never changes")
p.cont("gh", 40, 760, 360, 880, "GitHub · gilipersonal/mypaisa-agent", F_OUT, AMBER)
p.box("g1", 70, 820, 300, 230, "<b>Every PR: gates</b><br>ruff · pyright · pytest + moto<br>terraform fmt/validate · tflint<br>security scan · gitleaks · pip-audit<br>jira-key")
p.box("g2", 70, 1100, 300, 90, "<b>Plan for dev and prod</b><br>posted on the PR (ci-plan)")
p.box("g3", 70, 1295, 300, 90, "<b>Merge to main</b><br>build once → ECR by digest")
p.box("g4", 70, 1420, 300, 100, "<b>prod environment</b><br>Arun approves · main only")
p.box("g5", 70, 1550, 300, 80, "<b>Nightly drift check</b> (MA-108)")
p.group("acct", "account", 460, 170, 1880, 1350, "AWS account 545595341442 · us-east-1")
p.cont("shared", 500, 270, 1800, 240, "Shared in the account", F_AWS, GREY)
p.icon("s_r53", "r53", 560, 320, "Route 53 zone<br>(wealth-tracker dns/ root)")
p.icon("s_acm", "acm", 800, 320, "ACM wildcard<br>*.mypaisapp.com")
p.icon("s_ecr", "ecr", 1040, 320, "ECR<br>image by digest")
p.icon("s_state", "s3", 1280, 320, "S3 Terraform state<br>mypaisa-agent/&lt;env&gt;/")
p.icon("s_oidc", "sts", 1520, 320, "GitHub OIDC provider<br>(reused)")
p.icon("s_roles", "role", 1760, 320, "ci-plan · ci-dev-deploy<br>ci-prod-deploy")
p.icon("s_budg", "budgets", 2000, 320, "AWS Budgets<br>£75 backstop")
for env, x0, fill, label in (("dev", 500, "#F2F5FB", "dev · mypaisa-dev-* · *-dev.mypaisapp.com · synthetic data"),
                             ("prod", 1420, "#FBF4F1", "prod · mypaisa-prod-* · *.mypaisapp.com · household data")):
    p.cont(f"{env}c", x0, 580, 880, 850, label, fill, NAVY)
    sfx = "-dev" if env == "dev" else ""
    cx = [x0 + 60, x0 + 280, x0 + 500, x0 + 720]
    p.icon(f"{env}_cf", "cf", cx[0], 650, f"CloudFront + S3<br>console{sfx}")
    p.icon(f"{env}_api", "apigw", cx[1], 650, f"API Gateway<br>api{sfx}")
    p.icon(f"{env}_cog", "cognito", cx[2], 650, f"Cognito<br>auth{sfx}")
    p.icon(f"{env}_ssm", "ssm", cx[3], 650, f"SSM<br>/mypaisa-agent/{env}/")
    p.icon(f"{env}_lam", "lambda", cx[0], 860, "Lambdas<br>live alias · rollback")
    p.icon(f"{env}_sqs", "sqs", cx[1], 860, "SQS<br>updates · outbox · work")
    p.icon(f"{env}_ddb", "ddb", cx[2], 860, "DynamoDB<br>" + ("seeded" if env == "dev" else "prevent_destroy"))
    p.icon(f"{env}_s3", "s3", cx[3], 860, "S3 lake + docs<br>" + ("synthetic" if env == "dev" else "versioned"))
    p.box(f"{env}_keys", x0 + 60, 1110, 760, 110,
          f"<b>Own keys</b>: Telegram bot · Claude workspace ({'$40' if env == 'dev' else '$160'} limit) · Google OAuth client · Cognito pool · Twelve Data key<br>values put in SSM by hand; Terraform ignores them")
    p.box(f"{env}_apply", x0 + 60, 1280, 760, 120,
          ("<b>Applied by</b> the developer (saved plan file) or CI (ci-dev-deploy)<br>smoke tests against api-dev after every deploy"
           if env == "dev" else "<b>Applied only by CI</b> (ci-prod-deploy) after dev passes and Arun approves<br>live alias moves · failed smoke test rolls back on its own"))
p.line("g3", "dev_apply", "deploy dev", color=CORAL, pa=R, pb=Lf, lpos=0.5)
p.line("g4", "prod_apply", "deploy prod after approval", color=CRIMSON, pa=R, pb=B, kind="elbow", lpos=0.35, side="bottom")
pages.append(p)

# ---------------------------------------------------------------- 3 identity
p = Page("p3", "3 Identity and sign-in", "Identity and sign-in",
         "one Cognito user pool per environment · one user per member · Telegram, Google and passkeys · MA-109, MA-75, MA-76, MA-77, MA-102")
p.cont("doors", 40, 200, 380, 1210, "Doors in", F_HOME, NAVY)
p.box("d_mini", 70, 230, 320, 130, "<b>Mini App</b><br>Telegram signs initData<br>(HMAC with the bot token)<br>second check: Face ID or PIN")
p.box("d_widget", 70, 400, 320, 110, "<b>Browser · Telegram Login Widget</b><br>one tap, confirmed in the app")
p.box("d_google", 70, 560, 320, 100, "<b>Browser · Sign in with Google</b><br>linked by a code typed in the chat")
p.box("d_passkey", 70, 720, 320, 100, "<b>Browser · passkey</b><br>WebAuthn, after the first sign-in")
p.box("d_new", 70, 900, 320, 170, "<b>New device?</b><br>\"Was this you?\" to the member<br>and the owner<br>[Yes, it was me] [No, sign it out]")
p.box("d_chat", 70, 1130, 320, 150, "<b>The chat itself</b><br>update.from.id → member<br>unknown id: silence<br>paused: one line, nothing else")
p.group("cl3", "cloud", 480, 170, 1520, 1240, "AWS · prod (dev the same)")
p.icon("i_api", "apigw", 600, 300, "API Gateway<br>/auth/telegram · /v1")
p.icon("i_trig", "lambda", 840, 300, "auth challenge λ<br>HMAC · 5 min · no replay")
p.box("i_idp", 1360, 230, 340, 170, "<b>Linked to one Cognito user</b><br>Telegram id<br>Google (provider, sub)<br>passkeys (WebAuthn)<br>relying party fixed per env")
p.icon("i_cog", "cognito", 1080, 560, "Cognito user pool<br>no passwords · no sign-up")
p.icon("i_apil", "lambda", 1360, 560, "api λ<br>sets the session cookie")
p.box("i_cookie", 1580, 540, 360, 160, "<b>Session cookie</b> on api.mypaisapp.com<br>HttpOnly · Secure · SameSite=Strict<br>5-minute tokens behind it<br>never visible to page scripts")
p.icon("i_ssm", "ssm", 1080, 840, "SSM<br>bot token = HMAC key")
p.icon("i_ddb", "ddb", 1440, 840, "DynamoDB<br>Member: status, role, epoch")
p.icon("i_authz", "lambda", 1715, 840, "authorizer λ<br>session · status · epoch<br>on every call")
p.box("i_admin", 560, 1060, 700, 200,
      "<b>Admin center (owner only, browser only)</b><br>fresh check within 5 minutes: passkey or Google<br>Sign out everywhere → AdminUserGlobalSignOut + epoch + 1<br>Pause → AdminDisableUser; every session ends<br>every action: audit row + Telegram to the member and the owner",
      F_FAIL, CRIMSON)
p.icon("i_out", "sqs", 1440, 1115, "SQS outbox<br>notices to members")
p.line("d_mini", "i_api", "initData", color=BLUE, pa=R, pb=(0, 0.35), lpos=0.5)
p.line("d_widget", "i_api", "widget payload", color=BLUE, pa=R, pb=(0, 0.85), lpos=0.45, side="bottom")
p.line("d_google", "i_cog", "Google via auth.mypaisapp.com", color=BLUE, pa=R, pb=(0, 0.5), lpos=0.45)
p.line("d_passkey", "i_cog", "WebAuthn", color=BLUE, pa=R, pb=(0, 0.9), lpos=0.3)
p.line("i_api", "i_trig", "", color=BLUE, pa=R, pb=Lf)
p.line("i_trig", "i_cog", "tokens", color=BLUE, pa=R, pb=T, kind="elbow", lpos=0.3)
p.line("i_cog", "i_idp", "", color=BLUE, pa=(1, 0.2), pb=(0.5, 1))
p.line("i_cog", "i_apil", "code", color=BLUE, pa=R, pb=Lf)
p.line("i_apil", "i_cookie", "", color=BLUE, pa=R, pb=Lf)
p.line("i_cookie", "i_authz", "", color=BLUE, pa=((1760 - 1580) / 360, 1), pb=T)
p.line("i_authz", "i_ddb", "", color=BLUE, pa=Lf, pb=R)
p.line("i_admin", "i_cog", "sign out · disable", color=CRIMSON, pa=(1, 0.2), pb=(1, 0.8), kind="elbow", lpos=0.5)
p.line("i_admin", "i_out", "", color=CRIMSON, pa=(1, 0.675), pb=Lf)
p.line("d_new", "i_admin", "No, sign it out", color=CRIMSON, dashed=True, pa=R, pb=(0, 0.4), kind="elbow", lpos=0.6)
pages.append(p)


# ---------------------------------------------------------------- 4 queues
p = Page("p4", "4 Queues and self-healing", "Queues, retries and replay",
         "nothing is lost: every hand-off goes through SQS · idempotent handlers · a dead-letter queue behind each · MA-139, MA-140, MA-137, MA-135")
p.box("q_tg", 40, 210, 220, 110, "<b>Telegram</b><br>a member's message", F_OUT, AMBER)
p.group("cl4", "cloud", 320, 160, 1900, 1240, "AWS · us-east-1 · prod (dev has the same queues)")
p.icon("q_apigw", "apigw", 380, 220, "API Gateway<br>/telegram/webhook")
p.icon("q_hook", "lambda", 620, 220, "webhook λ<br>secret check · answers at once")
p.icon("q_in", "sqs", 880, 220, "updates.fifo<br>group = member's chat<br>dedupe = update_id")
p.icon("q_agent", "lambda", 1160, 220, "agent λ<br>lane per member")
p.icon("q_out", "sqs", 1440, 220, "outbox.fifo<br>group = chat")
p.icon("q_send", "lambda", 1700, 220, "sender λ<br>honours retry_after")
p.box("q_tg2", 2280, 220, 230, 90, "<b>Telegram</b><br>replies in order", F_OUT, AMBER)
p.icon("q_sched", "sched", 380, 560, "EventBridge Scheduler<br>retry policy + own DLQ")
p.icon("q_work", "sqs", 880, 560, "work queue<br>ingest · news · docs<br>engine · briefs · scoring")
p.icon("q_worker", "lambda", 1160, 560, "worker λ<br>capped concurrency")
p.box("q_free", 1440, 560, 300, 120, "<b>Free data sources</b><br>yfinance · Twelve Data (8/min)<br>FRED · GDELT · RSS", F_OUT, AMBER)
p.icon("q_idem", "ddb", 880, 820, "DynamoDB<br>idempotency records<br>(Powertools)")
p.box("q_rules", 1440, 760, 700, 190,
      "<b>Retry rules, all settings</b><br>updates: 3 tries within about a minute, so a lane never stays stuck<br>outbox: 5 tries, waiting as long as Telegram asks<br>work: 5 tries, backoff 30 seconds to 30 minutes<br>what can never succeed: straight to its dead-letter queue")
p.cont("fail", 360, 1040, 1820, 320, "Failure path", F_FAIL, CRIMSON, dashed=True)
p.icon("q_dlq", "queue", 440, 1130, "dead-letter queues<br>updates · outbox · work · scheduler<br>kept 14 days")
p.icon("q_s3", "s3", 720, 1130, "S3 raw/dlq/<br>copy for good")
p.icon("q_cw", "cw", 980, 1130, "CloudWatch alarm<br>depth over 0")
p.icon("q_sns", "sns", 1240, 1130, "SNS admin-alerts<br>→ alert router")
p.box("q_replay", 1500, 1095, 640, 160,
      "<b>Replay</b> moves messages back to their queue<br>phase 1: scripts/redrive.sh · phase 5: [Replay] on the alert<br>phase 12: the ops warden, once the cause is healthy,<br>at most 3 times, then an incident<br>an update over an hour old asks \"still want this?\"",
      F_NOTE, CRIMSON)
p.line("q_tg", "q_apigw", "", pa=R, pb=Lf)
p.line("q_apigw", "q_hook", "", pa=R, pb=Lf)
p.line("q_hook", "q_in", "", pa=R, pb=Lf)
p.line("q_in", "q_agent", "", pa=R, pb=Lf)
p.line("q_agent", "q_out", "", pa=R, pb=Lf)
p.line("q_out", "q_send", "", pa=R, pb=Lf)
p.line("q_send", "q_tg2", "", pa=R, pb=Lf)
p.line("q_sched", "q_work", "jobs", pa=R, pb=Lf)
p.line("q_work", "q_worker", "", pa=R, pb=Lf)
p.line("q_worker", "q_free", "", color=AMBER, pa=R, pb=Lf)
p.line("q_worker", "q_out", "briefs", pa=(0.75, 0), pb=(0, 0.85))
p.line("q_agent", "q_work", "documents", pa=(0, 0.75), pb=(1, 0), lpos=0.5)
p.line("q_worker", "q_idem", "done?", color=GREY, pa=(0, 1), pb=T, lpos=0.72)
p.line("q_work", "q_dlq", "after the last try", color=CRIMSON, dashed=True, pa=(0, 0.65), pb=T, lpos=0.5)
p.line("q_dlq", "q_s3", "", color=CRIMSON, dashed=True, pa=R, pb=Lf)
p.line("q_s3", "q_cw", "", color=CRIMSON, dashed=True, pa=R, pb=Lf)
p.line("q_cw", "q_sns", "", color=CRIMSON, dashed=True, pa=R, pb=Lf)
p.line("q_sns", "q_replay", "", color=CRIMSON, dashed=True, pa=R, pb=Lf)
pages.append(p)

# ---------------------------------------------------------------- 5 data
p = Page("p5", "5 Data stores", "Where the data lives",
         "DynamoDB for state, small and fast · S3 for the record, in Parquet, queried with DuckDB · SSM for keys · MA-27, MA-104, MA-132")
p.group("cl5", "cloud", 40, 170, 2260, 1040, "AWS · one copy per environment (mypaisa-dev-*, mypaisa-prod-*)")
p.cont("ddbc", 70, 270, 1210, 640, "DynamoDB · one table, on-demand", F_AWS, PURPLE)
p.icon("ddbi", "ddb", 110, 330, "DynamoDB<br>on-demand")
p.box("k1", 260, 320, 990, 110, "<b>Keys</b> PK=HH#&lt;household&gt; · SK=TX#&lt;date&gt;#&lt;id&gt; · VAL#&lt;position&gt;#&lt;date&gt; · NW#&lt;date&gt; · AUD#&lt;ts&gt;#&lt;id&gt;<br>GSI1 MEMBER# · GSI2 POS# / LIAB# · the registry never scans", align="left")
groups = [
    ("Household", "Portfolio · Member · Invite<br>Account (owners, institution)"),
    ("Holdings", "Instrument (exposure map)<br>Position · Valuation · Document<br>Transaction · Liability (phase 9)"),
    ("Analysis", "Signal · Stance · MacroRegime<br>Forecast · ModelVersion<br>ScoreDaily · CalibrationMap"),
    ("Members and chat", "ChatTurn (90 days, append-only)<br>Decision · AlertState<br>PendingAction (a day)"),
    ("Audit and runs", "AuditEvent (hash-chained)<br>RunRecord (90 days)<br>SentimentIndex · ArticleScore"),
    ("Settings and approvals", "Setting · ConfigVersion<br>ChangeRequest · AdminQuestion<br>Incident (phase 12)"),
    ("Budgets and alerts", "BudgetSettings · SpendMonth<br>AwsSpendMonth · AlertRule · Alert"),
    ("Identity", "Cognito holds users;<br>Member holds role, status,<br>session epoch"),
]
for i, (h, t) in enumerate(groups):
    x = 100 + (i % 4) * 290; y = 480 + (i // 4) * 200
    p.box(f"dg{i}", x, y, 270, 170, f"<b>{h}</b><br>{t}", "#F5EEFB", PURPLE)
p.cont("lakec", 1320, 270, 950, 640, "S3 lake bucket · Parquet by date", F_AWS, GREEN)
p.icon("lakei", "s3", 1350, 330, "S3 lake<br>versioned in prod")
prefixes = [
    ("raw/&lt;source&gt;/dt=", "as fetched · 90 days, then IA"),
    ("curated/", "prices, economy, events, news matches<br>with the date each was known"),
    ("features/dt=", "each day's feature snapshot"),
    ("predictions/model=/dt=", "every stance and forecast as made"),
    ("outcomes/model=/dt=", "every grade"),
    ("models/ · calibration/", "model files, test reports, maps"),
    ("reports/ · config/snapshots/", "backtests, reviews, daily settings"),
    ("raw/dlq/", "dead-lettered messages, for good"),
]
for i, (k, v) in enumerate(prefixes):
    x = 1500 + (i % 2) * 380; y = 320 + (i // 2) * 140
    p.box(f"pf{i}", x, y, 350, 120, f"<b>{k}</b><br>{v}", "#F1F6EA", GREEN)
p.icon("duck", "lambda", 1350, 990, "DuckDB in Lambda<br>reads Parquet (MA-104)")
p.icon("docs", "s3", 1650, 990, "S3 documents<br>factsheets · screenshots")
p.icon("web", "s3", 1950, 990, "S3 web app<br>behind CloudFront")
p.icon("ssm5", "ssm", 150, 990, "SSM /mypaisa-agent/&lt;env&gt;/<br>bot token · webhook secret<br>Claude key · Google secret")
p.box("rule5", 380, 980, 870, 140, "<b>Rules</b><br>nothing is overwritten: corrections are new rows · secrets set by hand, never in Terraform state<br>prod tables: deletion protection and point-in-time recovery · the whole history is a few GB",
      F_NOTE, GREY)
p.line("ddbi", "k1", "", color=GREY, pa=R, pb=Lf)
p.line("duck", "lakec", "queries", color=GREEN, pa=T, pb=((1395 - 1320) / 950, 1))
pages.append(p)

# ---------------------------------------------------------------- 6 market agent and learning loop
p = Page("p6", "6 Market agent and learning loop", "The market agent: rules engine, Forecaster and the learning loop",
         "phase 2 rules engine · phase 11 Forecaster (MA-117) · phase 12 learning loop and agents (MA-127) · code decides, Claude explains")
p.box("m_src", 40, 200, 300, 260, "<b>Free data first</b><br>yfinance · Twelve Data free<br>FRED / ALFRED · BoE · ECB · ONS<br>EIA (oil) · GDELT · GPR index<br>RSS · calendars<br>EODHD only if approved", F_OUT, AMBER)
p.group("cl6", "cloud", 400, 170, 1900, 1340, "AWS · prod")
p.group("wf", "sfnwf", 440, 230, 1540, 600, "Daily run · Step Functions · retries on every step (phase 12)")
p.icon("m_steward", "lambda", 500, 320, "data steward<br>failover · gaps · quotas")
p.icon("m_lake", "s3", 760, 320, "S3 curated<br>known-date stamped")
p.icon("m_feat", "lambda", 1000, 320, "features<br>trend · momentum · risk<br>macro · news tone")
p.icon("m_rules", "lambda", 1260, 270, "analyst · rules engine<br>pillars · cascade · confidence")
p.icon("m_fc", "lambda", 1260, 520, "Forecaster models<br>mood · risk · similar days<br>event impacts · direction")
p.icon("m_cal", "lambda", 1540, 400, "calibrate and combine<br>CalibrationMap")
p.icon("m_store", "ddb", 1800, 300, "DynamoDB<br>Stance · Forecast")
p.icon("m_pred", "s3", 1800, 560, "S3 predictions/<br>every one as made")
p.icon("m_card", "sqs", 2100, 400, "outbox → Telegram<br>side-by-side card")
p.icon("m_news", "lambda", 500, 620, "news scout<br>Haiku through Batches")
p.box("m_expo", 720, 610, 420, 150, "<b>Exposure map per holding</b> · news relevance<br>fund: holdings, countries, sectors, currencies<br>share: company, sector, markets, rivals<br>commodity: gold, silver, oil drivers", F_NOTE, GREY)
p.cont("learn", 440, 900, 1540, 560, "Learning loop · daily, bounded, approved (phase 12, MA-132 to MA-134)", F_P12, PURPLE)
p.box("m_calrule", 480, 1000, 480, 170, "<b>Daily calibration</b><br>refit on a rolling window<br>at most 2 points per bucket a day<br>used only when better · 10 days' probation<br>rolls back on its own", F_NOTE, PURPLE)
p.icon("m_score", "ddb", 1120, 1040, "ScoreDaily<br>30 · 90 · 365 days")
p.icon("m_out", "s3", 1440, 1040, "S3 outcomes/<br>never overwritten")
p.icon("m_grade", "lambda", 1760, 1040, "grader<br>after each close<br>Brier · log loss · range")
p.icon("m_chal", "lambda", 500, 1290, "tuner<br>challengers: retrain,<br>parameters, rule ranges")
p.box("m_lab", 700, 1270, 420, 150, "<b>Backtest lab</b> (MA-120)<br>ten years, walk-forward with a gap<br>last two years held out<br>then 8 live weeks in shadow", F_NOTE, PURPLE)
p.icon("m_cr", "ddb", 1270, 1290, "ChangeRequest<br>with scores side by side")
p.box("m_desk", 1490, 1270, 440, 150, "<b>Admin desk</b><br>Telegram card or Admin center<br>approve with the second check<br>then ModelVersion goes live", F_FAIL, CRIMSON)
p.box("m_claude", 40, 560, 300, 140, "<b>Claude</b><br>Haiku tags news<br>Sonnet explains<br>never a number", F_OUT, AMBER)
p.line("m_src", "m_steward", "", color=AMBER, pa=R, pb=Lf)
p.line("m_steward", "m_lake", "", pa=R, pb=Lf)
p.line("m_lake", "m_feat", "", pa=R, pb=Lf)
p.line("m_feat", "m_rules", "", pa=R, pb=Lf)
p.line("m_feat", "m_fc", "", pa=(1, 0.8), pb=Lf, kind="elbow")
p.line("m_rules", "m_cal", "", pa=R, pb=(0, 0.2))
p.line("m_fc", "m_cal", "", pa=R, pb=(0, 0.8))
p.line("m_cal", "m_store", "", pa=R, pb=Lf)
p.line("m_cal", "m_pred", "", pa=(1, 0.8), pb=Lf, kind="elbow")
p.line("m_store", "m_card", "", pa=R, pb=Lf)
p.line("m_news", "m_expo", "tags", pa=R, pb=Lf)
p.line("m_expo", "m_fc", "", pa=R, pb=(0, 0.8))
p.line("m_news", "m_claude", "Haiku", color=AMBER, dashed=True, pa=Lf, pb=R)
p.line("m_pred", "m_grade", "horizon passed", color=PURPLE, pa=R, pb=R, kind="elbow", lpos=0.5)
p.line("m_grade", "m_out", "", color=PURPLE, pa=Lf, pb=R)
p.line("m_out", "m_score", "", color=PURPLE, pa=Lf, pb=R)
p.line("m_score", "m_calrule", "", color=PURPLE, pa=Lf, pb=R)
p.line("m_chal", "m_lab", "", color=PURPLE, pa=R, pb=Lf)
p.line("m_lab", "m_cr", "beats current", color=PURPLE, pa=R, pb=Lf)
p.line("m_cr", "m_desk", "", color=PURPLE, pa=R, pb=Lf)
pages.append(p)

# ---------------------------------------------------------------- 7 agent team, caps and alerts
p = Page("p7", "7 Agent team, caps and alerts", "The agent team, settings, spend caps and alerts",
         "phase 5 caps and alerts (MA-137) · phase 12 agents and settings (MA-127) · everything configurable by the admin, nothing changed without asking")
p.cont("adm", 40, 170, 400, 1000, "Admins only", F_HOME, NAVY)
p.box("a_tg", 70, 230, 340, 150, "<b>Admin's Telegram chat</b><br>request cards: [Approve] [Reject] [Why?] [Later]<br>instructions in plain words<br>approve with Face ID or PIN")
p.box("a_web", 70, 440, 340, 170, "<b>Admin center</b> (console)<br>Spend · Alerts · Approvals<br>Settings · Agents · Incidents<br>fresh check: passkey or Google")
p.box("a_mail", 70, 670, 340, 100, "<b>Email</b><br>system alerts only, via SNS")
p.box("a_rule", 70, 830, 340, 300, "<b>Bands</b><br>inside a setting's automatic band: an agent may act, and says so in the daily digest<br>outside it: a request to an admin<br>never: trade, read a secret, delete data, apply infrastructure")
p.group("cl7", "cloud", 500, 170, 1780, 1530, "AWS · prod")
p.cont("agc", 540, 270, 1700, 220, "Nine agents · Lambda · each with its own IAM role and tools", F_P12, PURPLE)
agents = [("concierge", "chat · cards"), ("data steward", "sources"), ("news scout", "tags news"), ("analyst", "rules engine"),
          ("Forecaster", "models"), ("grader and tuner", "learning loop"), ("ops warden", "repairs"), ("budget keeper", "meter · ladder"),
          ("admin desk", "the asking")]
for i, (n, d) in enumerate(agents):
    p.icon(f"ag{i}", "lambda", 580 + i * 185, 330, f"{n}<br>{d}", size=80)
p.icon("a_api", "apigw", 600, 580, "API Gateway<br>/v1/admin")
p.icon("a_bus", "bus", 1300, 580, "EventBridge bus<br>mypaisa-&lt;env&gt;-events")
p.icon("a_set", "lambda", 860, 760, "settings service<br>schema · range · band")
p.icon("a_setdb", "ddb", 1100, 760, "Setting<br>ConfigVersion")
p.icon("a_snap", "s3", 1340, 760, "S3 config/snapshots/")
p.icon("a_cr", "ddb", 1700, 760, "ChangeRequest<br>AdminQuestion · Incident")
p.cont("caps", 540, 960, 1700, 680, "Caps and alerts, set in the Admin center (MA-137)", F_FAIL, CRIMSON)
p.box("c_claude", 580, 1020, 540, 280, "<b>Claude: Max 20x credit $200 a month</b><br>ceilings $160 prod · $40 dev (settings)<br>meter: every call costed from usage → SpendMonth<br>steps 70% tell · 85% savers · 95% essentials · 100% templates<br>guards: member 60% · day 3x average · 8 calls a run<br>hard stops: Console workspace limits, then the credit",
      F_NOTE, CRIMSON)
p.icon("c_ce", "ce", 1160, 1040, "Cost Explorer<br>once a day")
p.box("c_aws", 1320, 1020, 480, 220, "<b>AWS and others: £50 a month</b><br>steps 50% · 80% · 100% · forecast over cap<br>80%: dev's schedules pause<br>100%: non-essential prod jobs pause<br>never the brief, alerts or chat<br>actions are flags, not resource changes",
      F_NOTE, CRIMSON)
p.icon("c_budg", "budgets", 600, 1460, "AWS Budgets £75<br>Terraform backstop")
p.icon("c_sns", "sns", 900, 1460, "SNS admin-alerts<br>→ admin's email<br>1,000 a month free")
p.icon("c_rt", "lambda", 1200, 1460, "alert router<br>type × severity matrix<br>quiet hours · cooldown")
p.icon("c_out", "sqs", 1500, 1460, "SQS outbox<br>→ admin's Telegram")
p.box("c_web", 1780, 1450, 400, 110, "<b>Web Alerts page</b><br>Alert rows · badge · [Replay] on failed work")
p.line("a_tg", "agc", "", color=NAVY, both=True, pa=R, pb=(0, 0.2))
p.line("a_web", "a_api", "", color=BLUE, pa=R, pb=Lf)
p.line("a_api", "a_set", "change a setting", color=BLUE, pa=R, pb=T, kind="elbow", lpos=0.3)
p.line("agc", "a_bus", "", color=PURPLE, pa=((1345 - 540) / 1700, 1), pb=T)
p.line("a_bus", "a_set", "propose", color=PURPLE, pa=(0, 0.8), pb=(0.7, 0), kind="elbow", lpos=0.4)
p.line("a_bus", "a_cr", "ask an admin", color=PURPLE, pa=(1, 0.8), pb=T, kind="elbow", lpos=0.4)
p.line("a_set", "a_setdb", "", color=PURPLE, pa=R, pb=Lf)
p.line("a_setdb", "a_snap", "", color=PURPLE, pa=R, pb=Lf)
p.line("c_ce", "c_aws", "", color=CRIMSON, pa=R, pb=Lf)
p.line("c_budg", "c_sns", "over £75", color=CRIMSON, dashed=True, pa=R, pb=Lf)
p.line("c_rt", "c_sns", "email", color=CRIMSON, pa=Lf, pb=R)
p.line("c_rt", "c_out", "Telegram", color=CRIMSON, pa=R, pb=Lf)
p.line("c_rt", "c_web", "web", color=CRIMSON, pa=T, pb=T, kind="elbow", lpos=0.5)
pages.append(p)


doc = {"version": 1, "pages": [pg.out() for pg in pages]}
json.dump(doc, open(sys.argv[1], "w"), indent=1)
print("pages", len(pages), "shapes", sum(len(pg.shapes) for pg in pages), "lines", sum(len(pg.lines) for pg in pages))
