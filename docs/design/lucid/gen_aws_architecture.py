"""Build the MyPaisa Agent AWS architecture document (Lucid Standard Import JSON), one page per view.

MA-186 (v4), 26 Oct 2026, drawn here by MA-225. The member has two doors, each with the chat, the dashboard and the
Admin center: the iOS app, MyPaisa, for iPhone, iPad and a foldable (a React Native shell with a native SwiftUI core),
and the web app, a SvelteKit 3 PWA at dashboard(-dev).mypaisapp.com, whose site also serves the iOS app's
apple-app-site-association file and the /join invite page. Both doors call only the api host,
api(-dev).mypaisapp.com, and receive everything over one SSE stream on it (/v1/stream): the sender appends to the
member's stream log, which the stream sends to every open door, and sends Apple push or Web Push only to a device with
no fresh Presence. The household's own records are kinds, records, events and views (ARCHITECTURE 4.8), with
commitments and check-ins (4.9); anything new is created in the chat and an existing figure is corrected in place,
both through one write service that writes the change with its audit row in one transaction (4.10).
Usage:

    python3 gen_aws_architecture.py aws-architecture.lucid.json [08-add-holding-sequence.puml]

The optional second argument writes view 8, adding a record through the chat and correcting a figure in place, as
PlantUML for Lucid's sequence importer (the Standard Import format has no sequence diagrams).

A change after the first import is made in the Lucid documents in place, so their ids and links stay: a shape's text
and box by its id (the ids here are the ids in Lucid), and view 8 by replacing its sequence generator's markup.
"""
import json, re, sys

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
# The chat runs as a U: in along row B (HTTP API → api → updates.fifo), the agent at the turn, out along row A
# (outbox.fifo → sender → the SSE stream on the api host), so both doors sit next to it. The sender appends to the
# member's stream log, which the stream sends to every open door, and pushes through Apple (APNs, straight above it)
# or Web Push only to a device with no fresh Presence.
p = Page("p1", "1 System overview", "MyPaisa Agent · system overview",
         "prod in us-east-1; dev is the same shape with -dev names · Terraform only, prod deployed by CI · design only, 26 Oct 2026 · "
         "MA-186 (v4): the chat at both doors, SSE on the api host · coral = chat and data · blue = sign-in and the web app · amber = outside services · crimson dashed = failure path")
c = [540, 750, 960, 1170, 1380, 1590, 1800, 2010]
YA, YB, YC, YD = 460, 720, 980, 1240
APP_Y, APP_H = 230, 600
WEB_Y, WEB_H = 880, 220
p.cont("home", 40, 200, 360, 1280, "Household", F_HOME, NAVY)
p.box("h_app", 70, APP_Y, 300, APP_H,
      "<b>MyPaisa app</b> (iPhone, iPad, foldable)<br>a React Native shell<br>with a SwiftUI core<br>the chat, the dashboard,<br>the Admin center<br><br>"
      "iOS 26 · MyPaisa Dev → dev<br>SSE stream · Apple push<br>files: presigned upload<br><br>sign in: Apple · Google<br>a passkey (added from You)<br>answers the second check<br>tokens in the Keychain")
p.box("h_web", 70, WEB_Y, 300, WEB_H,
      "<b>Web app</b> (SvelteKit 3 PWA)<br>the chat, the dashboard,<br>the Admin center<br>dashboard.mypaisapp.com<br>SSE stream · Web Push<br>Apple · Google · passkey<br>HttpOnly session cookie")
p.box("h_mem", 70, 1360, 300, 100, "<b>Members</b><br>owner, member, viewer<br>joined by an invite link")
p.box("h_mail", 70, 1230, 300, 110, "<b>Admin's email</b><br>system alerts through SNS<br>1,000 a month free")
p.box("o_apple", 615, 150, 360, 110, "<b>Apple · push services</b><br>Sign in with Apple · APNs<br>Web Push · TestFlight", F_OUT, AMBER)
p.box("o_claude", 1045, 150, 340, 110, "<b>Anthropic API</b> · Haiku · Sonnet<br>$200 credit: $160 prod · $40 dev", F_OUT, AMBER)
p.group("cloud", "cloud", 440, 320, 1760, 1160, "AWS account 545595341442")
p.group("region", "region", 480, 380, 1680, 1060, "us-east-1")
# row A: the way out
p.icon("ws", "apigw", c[0], YA, "API Gateway<br>/v1/stream · SSE<br>stream λ · api host")
p.icon("send", "lambda", c[1], YA, "sender λ<br>stream log, else push")
p.icon("qout", "sqs", c[2], YA, "SQS outbox.fifo<br>lane per member")
p.icon("r53", "r53", c[4], YA, "Route 53<br>mypaisapp.com zone")
p.icon("acm", "acm", c[5], YA, "ACM<br>*.mypaisapp.com")
p.icon("iam", "iam", c[6], YA, "IAM<br>role per function")
p.icon("ssm", "ssm", c[7], YA, "SSM Parameter Store<br>keys, set by hand")
# the turn
p.icon("agent", "lambda", c[3], 590, "agent λ<br>Claude tool loop<br>drafts · Confirm")
# row B: the way in
p.icon("apigw", "apigw", c[0], YB, "API Gateway<br>HTTP API + authorizer<br>api.mypaisapp.com")
p.icon("api", "lambda", c[1], YB, "api λ · /v1<br>chat · data · admin<br>PATCH: a correction<br>/auth/* for sign-in")
p.icon("qin", "sqs", c[2], YB, "SQS updates.fifo<br>lane per member")
p.icon("ddb", "ddb", c[4], YB, "DynamoDB<br>records · events · audit<br>stream log · Presence")
p.icon("lake", "s3", c[5], YB, "S3 lake<br>Parquet · DuckDB")
p.icon("ecr", "ecr", c[6], YB, "ECR<br>one arm64 image")
# row C: the web app's site, sign-in, files, phase 18
p.icon("cf", "cf", c[0], YC, "CloudFront<br>dashboard.mypaisapp.com")
p.icon("s3web", "s3", c[1], YC, "S3 dashboard site<br>PWA · AASA · /join")
p.icon("cog", "cognito", c[2], YC, "Cognito (Essentials)<br>no hosted domain<br>called by api /auth/*")
p.icon("trig", "lambda", c[3], YC, "Cognito triggers λ<br>Apple · Google tokens<br>passkey assertions")
p.icon("docs", "s3", c[4], YC, "S3 documents<br>presigned uploads<br>kept for good")
p.icon("sfn", "sfn", c[5], YC, "Step Functions<br>daily run (phase 18)")
p.icon("bus", "bus", c[6], YC, "EventBridge bus<br>agent team (phase 18)")
# row D: background work, failure, cost
p.icon("sns", "sns", c[0], YD, "SNS admin-alerts<br>email · alert router")
p.icon("cw", "cw", c[1], YD, "CloudWatch + X-Ray<br>logs · alarms")
p.icon("dlq", "queue", c[2], YD, "dead-letter queues<br>kept 14 days")
p.icon("sched", "sched", c[3], YD, "EventBridge Scheduler<br>Europe/London")
p.icon("qwork", "sqs", c[4], YD, "SQS work<br>background jobs")
p.icon("worker", "lambda", c[5], YD, "worker λ<br>ingest · news · docs<br>engine · briefs<br>check-ins · views")
p.icon("budg", "budgets", c[6], YD, "AWS Budgets<br>£75 backstop")
p.icon("ce", "ce", c[7], YD, "Cost Explorer<br>daily AWS meter")
p.cont("out", 2240, 380, 360, 1000, "Outside AWS", F_OUT, AMBER)
p.box("o_data", 2270, 440, 300, 170, "<b>Free data first</b><br>yfinance · Twelve Data free<br>FRED · BoE · ECB · EIA<br>GDELT · RSS<br>EODHD only on approval")
p.box("o_google", 2270, 670, 300, 110, "<b>Google</b><br>Sign in with Google<br>iOS and web clients")
p.box("o_gh", 2270, 840, 300, 200, "<b>GitHub Actions</b><br>OIDC, no AWS keys<br>gates · plan · build once<br>dev, then prod on approval<br>macOS runner: the app<br>→ TestFlight")
p.box("o_jira", 2270, 1100, 300, 100, "<b>Jira MA</b><br>every change traced")


def app_at(y):  # a point on the app box's right edge at canvas height y
    return (1, (y - APP_Y) / APP_H)


p.line("h_app", "apigw", "chat", pa=app_at(YB + 45), pb=Lf)  # short: the web app's stream runs down past it
p.line("ws", "h_app", "SSE", pa=Lf, pb=app_at(YA + 45))
p.line("h_web", "cf", "pages", color=BLUE, pa=(1, (YC + 45 - WEB_Y) / WEB_H), pb=Lf)
p.line("h_web", "apigw", "", color=BLUE, pa=(1, 10 / WEB_H), pb=(0, 0.9))  # /v1 with the cookie; a label lands on the api label
p.line("o_apple", "h_app", "sign in · push", color=AMBER, both=True, pa=(0, 0.9), pb=app_at(249))
p.line("apigw", "api", "", pa=R, pb=Lf)
p.line("api", "qin", "", pa=R, pb=Lf)
p.line("qin", "agent", "", pa=R, pb=(0, 0.7))
p.line("agent", "qout", "", pa=(0, 0.3), pb=R)
p.line("qout", "send", "", pa=Lf, pb=R)
p.line("send", "ws", "", pa=Lf, pb=R)
p.line("send", "o_apple", "push, no presence", pa=T, pb=B, lpos=0.3)
p.line("agent", "o_claude", "messages", color=AMBER, pa=T, pb=B, lpos=0.5)
p.line("cog", "trig", "", color=BLUE, pa=R, pb=Lf)
p.line("cf", "s3web", "", color=BLUE, pa=R, pb=Lf)
p.line("sched", "qwork", "", pa=R, pb=Lf)
p.line("qwork", "worker", "", pa=R, pb=Lf)
p.line("dlq", "cw", "", color=CRIMSON, dashed=True, pa=Lf, pb=R)
p.line("cw", "sns", "", color=CRIMSON, dashed=True, pa=Lf, pb=R)
p.line("sns", "h_mail", "", color=CRIMSON, dashed=True, pa=Lf, pb=(1, (YD + 45 - 1230) / 110))
# The api's /auth/* routes call Cognito's API (custom auth); added last, so the earlier line ids stay.
p.line("api", "cog", "", color=BLUE, pa=(1, 0.75), pb=T)  # clears the api's and the queue's labels
# The stream reaches the web app too (MA-186): it leaves the stream below its line to the app and runs down the gap
# between the household and the AWS account (x 420 in Lucid, routed there by hand: the automatic elbow crossed the
# chat label) to the web app's box. Added last, so the earlier line ids stay; Lucid gave it the id 5QYGy__nNbRw.
p.line("ws", "h_web", "", pa=(0, 0.8), pb=(1, 0.35), kind="elbow")
pages.append(p)


# ---------------------------------------------------------------- 2 environments and delivery
p = Page("p2", "2 Environments and delivery", "Environments, domains and delivery",
         "one AWS account, every component twice · Terraform only, applied by CI · prod after Arun's approval · "
         "web app to S3, iOS app to TestFlight · MA-26, MA-106 to MA-108, MA-161, MA-166, MA-167, MA-186")
p.cont("dev_laptop", 40, 170, 360, 520, "Developer laptop", F_HOME, NAVY)
p.box("lap1", 70, 230, 300, 130, "<b>Local run</b> (MA-198)<br>moto · one ASGI app with SSE<br>SvelteKit dev · iOS simulator<br>or both against api-dev")
p.box("lap2", 70, 400, 300, 110, "<b>Developer role</b><br>works in dev · explicit deny<br>on anything tagged env=prod")
p.box("lap3", 70, 560, 300, 100, "<b>AWS MCP</b><br>reads only · never changes")
p.cont("gh", 40, 760, 360, 1180, "GitHub · gilipersonal/mypaisa-agent", F_OUT, AMBER)
p.box("g1", 70, 820, 300, 215, "<b>Every PR: gates</b><br>ruff · pyright · pytest + moto<br>terraform fmt/validate · tflint<br>security scan · gitleaks<br>pip-audit · jira-key · plan-sync")
p.box("g1i", 70, 1050, 300, 170, "<b>PRs touching ios/ or web/</b><br>macOS: Jest · tsc (the shell)<br>swift-format · XCUITest<br>snapshots · a11y audit<br>web: svelte-check · vitest<br>Playwright at 390 and 1440")
p.box("g2", 70, 1230, 300, 100, "<b>Plan for dev and prod</b><br>posted on the PR (ci-plan)")
p.box("g3", 70, 1360, 300, 130, "<b>Merge to main</b><br>build once → ECR by digest<br>the web app built once<br>the iOS app archived once")
p.box("g4", 70, 1520, 300, 130, "<b>prod environment</b><br>Arun approves · main only<br>App Store Connect key here only")
p.box("g6", 70, 1680, 300, 130, "<b>TestFlight lanes</b><br>MyPaisa Dev after dev's smoke tests<br>MyPaisa after the approval")
p.box("g5", 70, 1840, 300, 80, "<b>Nightly drift check</b> (MA-108)")
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
    cx = [x0 + 40, x0 + 210, x0 + 380, x0 + 550, x0 + 720]
    p.icon(f"{env}_cf", "cf", cx[0], 650, f"CloudFront + S3<br>dashboard{sfx}")
    p.icon(f"{env}_api", "apigw", cx[1], 650, f"API Gateway<br>HTTP · api{sfx}")
    p.icon(f"{env}_ws", "apigw", cx[2], 650, f"API Gateway<br>SSE · /v1/stream<br>on api{sfx}")
    p.icon(f"{env}_cog", "cognito", cx[3], 650, "Cognito<br>user pool<br>no domain")
    p.icon(f"{env}_ssm", "ssm", cx[4], 650, f"SSM<br>/mypaisa-agent/{env}/")
    rx = [x0 + 60, x0 + 260, x0 + 460, x0 + 660]
    p.icon(f"{env}_lam", "lambda", rx[0], 860, "Lambdas + stream λ<br>live alias · rollback")
    p.icon(f"{env}_sqs", "sqs", rx[1], 860, "SQS<br>updates · outbox<br>work · DLQs")
    p.icon(f"{env}_ddb", "ddb", rx[2], 860, "DynamoDB<br>registry · stream log<br>" + ("seeded" if env == "dev" else "prevent_destroy"))
    p.icon(f"{env}_s3", "s3", rx[3], 860, "S3 lake + documents<br>" + ("synthetic" if env == "dev" else "versioned"))
    p.box(f"{env}_keys", x0 + 60, 1090, 760, 140,
          f"<b>Own keys and ids</b>: Sign in with Apple ids · Google clients (iOS, web) · APNs key · Web Push key · Claude workspace "
          f"({'$40' if env == 'dev' else '$160'} limit) · Cognito pool · Twelve Data key<br>"
          "secret values put in SSM by hand over write-only placeholders (MA-159), never in state")
    p.box(f"{env}_apply", x0 + 60, 1260, 760, 140,
          ("<b>Applied by</b> the developer (saved plan file) or CI (ci-dev-deploy)<br>smoke tests against api-dev after every deploy<br>then the web app to dashboard-dev, MyPaisa Dev to TestFlight"
           if env == "dev" else "<b>Applied only by CI</b> (ci-prod-deploy) after dev passes and Arun approves<br>live alias moves · a failed smoke test rolls back on its own<br>then the web app to dashboard, MyPaisa to TestFlight"))
p.box("tf", 520, 1690, 1300, 110,
      "<b>Apple · App Store Connect · TestFlight</b> (Developer Program, $99 a year, MA-162)<br>"
      "internal testing for MyPaisa Dev and MyPaisa · Arun and his wife · no App Review · a build lasts 90 days, an alert at day 60",
      F_OUT, AMBER)
p.line("g3", "dev_apply", "", color=CORAL, pa=R, pb=Lf)  # no label: any label lands on the three borders it crosses
p.line("g4", "prod_apply", "deploy prod after approval", color=CRIMSON, pa=R, pb=B, kind="elbow", lpos=0.35, side="bottom")
p.line("g6", "tf", "uploads", color=AMBER, pa=R, pb=Lf, lpos=0.5)
pages.append(p)

# ---------------------------------------------------------------- 3 identity
p = Page("p3", "3 Identity and sign-in", "Identity and sign-in",
         "one Cognito user pool per environment, no hosted domain · one user per member · Apple, Google or a passkey, no passwords · "
         "MA-109, MA-75, MA-76, MA-77, MA-102, MA-161, MA-168, MA-186")
p.cont("doors", 40, 180, 380, 1290, "Doors in: the iOS app and the web app", F_HOME, NAVY)
# The doors column, top to bottom: (y, height), 16 apart inside the container (180 to 1470). The second check names what
# it guards and every way it is answered (ARCHITECTURE 4.5, MA-161 review round 2), so it is the tallest box.
DY = {"d_sign": (196, 164), "d_web": (376, 168), "d_passkey": (560, 140), "d_invite": (716, 96),
      "d_keychain": (828, 144), "d_second": (988, 316), "d_paused": (1320, 130)}


def door(sid, txt):
    p.box(sid, 60, DY[sid][0], 340, DY[sid][1], txt)


def door_at(sid, y):  # a point on a door box's right edge at canvas height y
    return (1, (y - DY[sid][0]) / DY[sid][1])


door("d_sign", "<b>MyPaisa app</b> (iPhone, iPad, foldable):<br>the chat, the dashboard, the Admin center<br>Apple native · Google SDK, PKCE<br>the token carries the api's nonce")
door("d_web", "<b>Web app</b> (SvelteKit 3 PWA):<br>the chat, dashboard, Admin center<br>dashboard.mypaisapp.com<br>Apple, Google or a passkey, same custom auth<br>an HttpOnly cookie set by the api")
# A passkey signs in to the web app only; in the app it answers the second check, never the sign-in screen (4.5).
door("d_passkey", "<b>Passkey</b> (optional): web sign-in;<br>in the app, the second check<br>added from You (MA-77)<br>challenge: /auth/passkey/options<br>assertion: /auth/passkey")
door("d_invite", "<b>Invite link</b> (MA-73)<br>dashboard.mypaisapp.com<br>/join/&lt;token&gt; opens the app")
door("d_keychain", "<b>App: Keychain</b>, this device only<br>refresh token, rotated on use<br>5-minute access token<br>on every call and<br>when a stream opens")
door("d_second", "<b>Second check</b> (MA-76, MA-102)<br>the owner's admin actions, from<br>the Admin center or admin's chat;<br>an import's Confirm and rolling<br>it back; leaving the household<br>"
     "a challenge bound to the action<br>app: Sign in with Apple again or<br>a passkey (Face ID); a member on<br>Google only: Google again<br>web: passkey or a fresh sign-in<br>under 5 minutes, never a<br>local-only Face ID")
door("d_paused", "<b>Refused</b><br>a paused member: one line<br>a removed member<br>linked to nobody, no valid invite")
p.box("o_idp", 560, 180, 420, 110, "<b>Apple · Google</b><br>sign the identity token (app and web)<br>publish their keys (JWKS)", F_OUT, AMBER)
p.group("cl3", "cloud", 480, 340, 1560, 1100, "AWS · prod (dev the same)")
p.icon("i_api", "apigw", 580, 420, "HTTP API<br>api.mypaisapp.com")
p.icon("i_apil", "lambda", 820, 420, "api λ<br>/auth/apple · /auth/google<br>/auth/passkey/options<br>/auth/passkey · nonce<br>custom auth · web's cookie")
p.icon("i_cog", "cognito", 1080, 420, "Cognito user pool<br>no passwords · no sign-up<br>no hosted domain:<br>the api calls its API")
p.icon("i_trig", "lambda", 1340, 420, "custom-auth triggers λ<br>Apple · Google token:<br>issuer · audience · expiry<br>issued under 5 min<br>nonce · no replay<br>passkey assertion:<br>signature · challenge<br>origin · relying-party id")
p.box("i_idp", 1560, 400, 440, 220, "<b>Linked to one Cognito user</b><br>Apple (sub) · Google (sub)<br>passkeys (WebAuthn)<br>relying party: dashboard.mypaisapp.com<br>(dashboard-dev in dev), whose site serves<br>the app's association file<br>linked to nobody: refused,<br>unless a valid invite creates the member")
p.icon("i_v1", "apigw", 580, 680, "HTTP API · /v1<br>(the same API)")
p.icon("i_ws", "apigw", 580, 900, "SSE stream · /v1/stream<br>api.mypaisapp.com<br>re-checked every 60 s")
p.icon("i_authz", "lambda", 820, 790, "authorizer λ<br>token or cookie<br>status · epoch")
p.icon("i_ddb", "ddb", 1080, 790, "DynamoDB<br>Member: status, role, epoch<br>Device: push token, Web Push")
p.icon("i_ssm", "ssm", 1340, 790, "SSM<br>audiences: bundle id,<br>services id, Google clients")
p.box("i_admin", 560, 1090, 660, 250,
      "<b>Admin center (owner only)</b><br>every action behind the second check<br>Sign out a device or everywhere →<br>AdminUserGlobalSignOut + epoch + 1<br>Pause → AdminDisableUser; every session ends<br>every action: audit row + a message in the chat<br>and a push to the member and the owner",
      F_FAIL, CRIMSON)
p.icon("i_out", "sqs", 1440, 1150, "SQS outbox → sender<br>the stream and push")
p.line("d_sign", "o_idp", "identity token", color=AMBER, both=True, pa=door_at("d_sign", 250), pb=(0, 70 / 110), lpos=0.5)  # level
p.line("d_sign", "i_api", "token", color=BLUE, pa=(1, 0.8), pb=(0, 0.3), lpos=0.5)
p.line("d_web", "i_api", "sign in", color=BLUE, pa=(1, 0.15), pb=(0, 0.6), lpos=0.5)
p.line("i_api", "i_apil", "", color=BLUE, pa=R, pb=Lf)
p.line("i_apil", "i_cog", "custom auth", color=BLUE, pa=R, pb=Lf)
p.line("i_cog", "i_trig", "", color=BLUE, pa=R, pb=Lf)
p.line("i_trig", "i_idp", "", color=BLUE, pa=R, pb=(0, 0.225))
p.line("i_trig", "o_idp", "published keys", color=AMBER, dashed=True, pa=T, pb=R, lpos=0.55)
p.line("d_web", "i_v1", "cookie", color=BLUE, pa=(1, 0.85), pb=(0, 0.3))
p.line("d_keychain", "i_v1", "token", color=BLUE, pa=(1, 0.1), pb=(0, 0.7))
p.line("d_keychain", "i_ws", "stream opens", color=BLUE, pa=door_at("d_keychain", 945), pb=Lf)  # level with the stream
p.line("i_v1", "i_authz", "", color=BLUE, pa=R, pb=(0, 0.25))
p.line("i_ws", "i_authz", "", color=BLUE, pa=R, pb=(0, 0.75))
p.line("i_authz", "i_ddb", "", color=BLUE, pa=R, pb=Lf)
p.line("d_second", "i_admin", "fresh assertion", color=CRIMSON, pa=door_at("d_second", 1090 + 0.2 * 250), pb=(0, 0.2))  # level
p.line("i_admin", "i_cog", "", color=CRIMSON, pa=(1, 0.15), pb=(1, 0.8), kind="elbow")  # the box says what it does
p.line("i_admin", "i_out", "", color=CRIMSON, pa=(1, 0.6), pb=Lf)
# The passkey's challenge and assertion go to the api's /auth/passkey routes (added last, so the earlier line ids stay).
# No label: the box names both routes, and a label here crowds the HTTP API's own.
p.line("d_passkey", "i_api", "", color=BLUE, pa=(1, 0.3), pb=(0, 0.9))
pages.append(p)


# ---------------------------------------------------------------- 4 queues
p = Page("p4", "4 Queues and self-healing", "Queues, retries and replay",
         "nothing is lost: every hand-off goes through SQS · idempotent handlers · a dead-letter queue behind each · "
         "replies over SSE on the api host, else Apple push or Web Push · MA-139, MA-140, MA-137, MA-135, MA-30, MA-31, MA-170, MA-195")
p.box("q_app", 40, 360, 220, 130, "<b>iOS app or web app</b><br>a member's message<br>with its client id", F_HOME, NAVY)
p.box("q_apns", 1595, 150, 300, 110, "<b>Apple push · Web Push</b><br>to a device with no<br>fresh presence", F_OUT, AMBER)
p.box("q_app2", 2280, 150, 240, 340, "<b>Every open door</b><br>replies in order<br>never twice<br>resumes from<br>its last event", F_HOME, NAVY)
p.group("cl4", "cloud", 320, 300, 1900, 1260, "AWS · us-east-1 · prod (dev has the same queues)")
p.icon("q_apigw", "apigw", 380, 380, "HTTP API<br>/v1/chat/messages<br>authorizer")
p.icon("q_hook", "lambda", 620, 380, "api λ<br>answers 202 at once")
p.icon("q_in", "sqs", 880, 380, "updates.fifo<br>group = member<br>dedupe = client id")
p.icon("q_agent", "lambda", 1160, 380, "agent λ<br>lane per member")
p.icon("q_out", "sqs", 1440, 380, "outbox.fifo<br>group = member")
p.icon("q_send", "lambda", 1700, 380, "sender λ<br>stream log,<br>else push")  # narrow: the line to its table leaves on the right
p.icon("q_ws", "apigw", 1960, 380, "SSE stream · /v1/stream<br>api.mypaisapp.com")
p.icon("q_conn", "ddb", 1960, 640, "DynamoDB<br>stream log · Presence<br>read by the stream")
p.icon("q_sched", "sched", 380, 720, "EventBridge Scheduler<br>retry policy + own DLQ")
p.icon("q_work", "sqs", 880, 720, "work queue<br>ingest · news · docs<br>engine · briefs · scoring")
p.icon("q_worker", "lambda", 1160, 720, "worker λ<br>capped concurrency")
p.box("q_free", 1440, 720, 300, 120, "<b>Free data sources</b><br>yfinance · Twelve Data (8/min)<br>FRED · GDELT · RSS", F_OUT, AMBER)
p.icon("q_idem", "ddb", 880, 980, "DynamoDB<br>idempotency records<br>(Powertools)")
p.box("q_rules", 1300, 920, 880, 230,
      "<b>Retry rules, all settings</b><br>updates: 3 tries within about a minute, so a lane never stays stuck<br>"
      "outbox: 5 tries; appended to the stream log, pushed to each device with no fresh presence<br>"
      "APNs and Web Push: retry-after honoured; a dead token or subscription is removed<br>work: 5 tries, backoff 30 seconds to 30 minutes<br>"
      "what can never succeed: straight to its dead-letter queue")
p.cont("fail", 360, 1210, 1820, 320, "Failure path", F_FAIL, CRIMSON, dashed=True)
p.icon("q_dlq", "queue", 440, 1300, "dead-letter queues<br>updates · outbox · work · scheduler<br>kept 14 days")
p.icon("q_s3", "s3", 720, 1300, "S3 raw/dlq/<br>copy for good")
p.icon("q_cw", "cw", 980, 1300, "CloudWatch alarm<br>depth over 0")
p.icon("q_sns", "sns", 1240, 1300, "SNS admin-alerts<br>→ alert router")
p.box("q_replay", 1500, 1265, 640, 180,
      "<b>Replay</b> moves messages back to their queue<br>phase 1: scripts/redrive.sh · phase 8: [Replay] on the alert<br>"
      "in the Admin center · phase 18: the ops warden, once the cause<br>is healthy, at most 3 times, then an incident<br>"
      "a message over an hour old asks \"still want this?\"",
      F_NOTE, CRIMSON)
p.line("q_app", "q_apigw", "", pa=R, pb=Lf)
p.line("q_apigw", "q_hook", "", pa=R, pb=Lf)
p.line("q_hook", "q_in", "", pa=R, pb=Lf)
p.line("q_in", "q_agent", "", pa=R, pb=Lf)
p.line("q_agent", "q_out", "", pa=R, pb=Lf)
p.line("q_out", "q_send", "", pa=R, pb=Lf)
p.line("q_send", "q_ws", "", pa=R, pb=Lf)
p.line("q_ws", "q_app2", "SSE", pa=R, pb=(0, (425 - 150) / 340))
p.line("q_send", "q_apns", "no fresh presence", pa=T, pb=B, lpos=0.35)
p.line("q_apns", "q_app2", "push", color=AMBER, pa=(1, 0.5), pb=(0, 55 / 340))
p.line("q_send", "q_conn", "", color=GREY, pa=(1, 0.8), pb=(0, 0.3))
p.line("q_sched", "q_work", "jobs", pa=R, pb=Lf)
p.line("q_work", "q_worker", "", pa=R, pb=Lf)
p.line("q_worker", "q_free", "", color=AMBER, pa=R, pb=(0, 0.375))
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
         "DynamoDB for state, small and fast: the household's records as kinds, records, events and views · S3 for the history, in Parquet, queried with DuckDB · "
         "every file sent kept for good · SSM for keys · MA-27, MA-28, MA-104, MA-132, MA-148, MA-161, MA-186, MA-197, MA-205")
p.group("cl5", "cloud", 40, 170, 2260, 1100, "AWS · one copy per environment (mypaisa-dev-*, mypaisa-prod-*)")
p.cont("ddbc", 70, 270, 1210, 640, "DynamoDB · the registry table, on-demand", F_AWS, PURPLE)
p.icon("ddbi", "ddb", 110, 330, "DynamoDB<br>on-demand")
p.box("k1", 260, 320, 990, 110, "<b>Keys</b> PK=HH#&lt;household&gt; · SK=KIND#&lt;kind&gt;#&lt;version&gt; · REC#&lt;record&gt; · EVT#&lt;record&gt;#&lt;seq&gt; · VIEW#&lt;view&gt;#&lt;date&gt; · AUD#&lt;ts&gt;#&lt;id&gt;<br>CHK#&lt;commitment&gt;#&lt;due date&gt; · GSI1 MEMBER# · the registry never scans", align="left")
# The household's own records are one dynamic structure (ARCHITECTURE 4.8): kinds as data, records as documents,
# history as events, figures as views; commitments and check-ins (4.9) beside them. The top row is that structure.
groups = [
    ("Kinds, as data", "typed fields<br>a valuation method<br>the events it accepts<br>check-in templates<br>versioned; the admin<br>approves a new one"),
    ("Records and events", "Record: a document<br>owners, parent, attrs<br>closed, never deleted<br>Event: append-only,<br>hash-chained,<br>never edited"),
    ("Views, from the events", "each record's value<br>NetWorth · budget month<br>what is due<br>ProjectionRun<br>rebuilt if a kind changes"),
    ("Commitments, check-ins", "Commitment: dated money<br>EMI · card bill · SIP<br>premium · salary · rent<br>CheckIn: one per due date<br>PlanItem (the admin's)"),
    ("Household and identity", "Portfolio · Invite<br>Member: role, status<br>and session epoch<br>Device: push, Web Push<br>Cognito holds the users"),
    ("Market and files", "Instrument (shared)<br>Valuation · Document<br>Signal · Stance<br>Forecast · ModelVersion<br>ScoreDaily"),
    ("Chat, audit and runs", "ChatTurn (90 days)<br>PendingAction (a day)<br>AuditEvent (hash-chained)<br>RunRecord (90 days)"),
    ("Settings, budgets, alerts", "Setting · ConfigVersion<br>ChangeRequest · Incident<br>BudgetSettings · Alert<br>SpendMonth · AlertRule"),
]
for i, (h, t) in enumerate(groups):
    x = 100 + (i % 4) * 290; y = 480 + (i // 4) * 205
    p.box(f"dg{i}", x, y, 270, 190, f"<b>{h}</b><br>{t}", "#F5EEFB", PURPLE)
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
p.icon("ssm5", "ssm", 150, 990, "SSM /mypaisa-agent/&lt;env&gt;/<br>Claude key · APNs key<br>Twelve Data key · ids")
p.box("rule5", 380, 980, 680, 230, "<b>Rules</b><br>nothing is overwritten: a correction is a new event<br>a record is closed, never deleted; a new kind is data<br>the views are rebuilt from the events, no migration<br>every file sent is kept for good, opened from its audit row<br>through a 5-minute link (MA-148, MA-149)<br>secrets set by hand, never in Terraform state<br>prod tables: deletion protection, point-in-time recovery",
      F_NOTE, GREY)
p.icon("conn5", "ddb", 1130, 990, "SSE stream items<br>StreamEvent · LiveHead<br>Presence · TTL")
p.icon("duck", "lambda", 1350, 990, "DuckDB in Lambda<br>the nightly Parquet of<br>records, events, views")
p.icon("docs", "s3", 1650, 990, "S3 documents<br>every file sent, kept<br>presigned upload · Audit")
p.icon("app5", "s3", 1950, 990, "S3 dashboard site<br>behind CloudFront<br>PWA · AASA · /join")
p.line("ddbi", "k1", "", color=GREY, pa=R, pb=Lf)
p.line("duck", "lakec", "queries", color=GREEN, pa=T, pb=((1395 - 1320) / 950, 1))
pages.append(p)

# ---------------------------------------------------------------- 6 market agent and learning loop
p = Page("p6", "6 Market agent and learning loop", "The market agent: rules engine, Forecaster and the learning loop",
         "phase 10 rules engine · phase 17 Forecaster (MA-117) · phase 18 learning loop and agents (MA-127) · phase 19 India (MA-147) · code decides, Claude explains")
p.box("m_src", 40, 190, 300, 330, "<b>Free data first</b><br>yfinance · Twelve Data free<br>FRED / ALFRED · BoE · ECB · ONS<br>EIA (oil) · GDELT · GPR index<br>RSS · calendars<br><b>India</b>: AMFI NAVs, phase 5<br>mfapi.in · NSE/BSE bhavcopy<br>RBI · NSDL flows: phase 19<br>EODHD only if approved", F_OUT, AMBER)
p.group("cl6", "cloud", 400, 170, 1900, 1340, "AWS · prod")
p.group("wf", "sfnwf", 440, 230, 1540, 600, "Daily run · Step Functions · retries on every step (phase 18)")
p.icon("m_steward", "lambda", 500, 320, "data steward<br>failover · gaps · quotas")
p.icon("m_lake", "s3", 760, 320, "S3 curated<br>known-date stamped")
p.icon("m_feat", "lambda", 1000, 320, "features<br>trend · momentum · risk<br>macro · news tone")
p.icon("m_rules", "lambda", 1260, 270, "analyst · rules engine<br>pillars · cascade · confidence")
p.icon("m_fc", "lambda", 1260, 520, "Forecaster models<br>mood · risk · similar days<br>event impacts · direction")
p.icon("m_cal", "lambda", 1540, 400, "calibrate and combine<br>CalibrationMap")
p.icon("m_store", "ddb", 1800, 300, "DynamoDB<br>Stance · Forecast")
p.icon("m_pred", "s3", 1800, 560, "S3 predictions/<br>every one as made")
p.icon("m_card", "sqs", 2100, 400, "outbox → the app<br>side-by-side card")
p.icon("m_news", "lambda", 500, 620, "news scout<br>Haiku through Batches")
p.box("m_expo", 720, 610, 420, 150, "<b>Exposure map per holding</b> · news relevance<br>fund: holdings, countries, sectors, currencies<br>share: company, sector, markets, rivals<br>commodity: gold, silver, oil drivers", F_NOTE, GREY)
p.cont("learn", 440, 900, 1540, 560, "Learning loop · daily, bounded, approved (phase 18, MA-132 to MA-134)", F_P12, PURPLE)
p.box("m_calrule", 480, 1000, 480, 170, "<b>Daily calibration</b><br>refit on a rolling window<br>at most 2 points per bucket a day<br>used only when better · 10 days' probation<br>rolls back on its own", F_NOTE, PURPLE)
p.icon("m_score", "ddb", 1120, 1040, "ScoreDaily<br>30 · 90 · 365 days")
p.icon("m_out", "s3", 1440, 1040, "S3 outcomes/<br>never overwritten")
p.icon("m_grade", "lambda", 1760, 1040, "grader<br>after each close<br>Brier · log loss · range")
p.icon("m_chal", "lambda", 500, 1290, "tuner<br>challengers: retrain,<br>parameters, rule ranges")
p.box("m_lab", 700, 1270, 420, 150, "<b>Backtest lab</b> (MA-120)<br>ten years, walk-forward with a gap<br>last two years held out<br>then 8 live weeks in shadow", F_NOTE, PURPLE)
p.icon("m_cr", "ddb", 1270, 1290, "ChangeRequest<br>with scores side by side")
p.box("m_desk", 1490, 1270, 440, 150, "<b>Admin desk</b><br>a card in the owner's chat in the app<br>or the Admin center<br>approve with the second check<br>then ModelVersion goes live", F_FAIL, CRIMSON)
p.box("m_claude", 40, 580, 300, 140, "<b>Claude</b><br>Haiku tags news<br>Sonnet explains<br>never a number", F_OUT, AMBER)
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
         "phase 8 caps and alerts (MA-137) · phase 18 agents and settings (MA-127) · alerts reach the app, push and email (MA-161) · "
         "everything configurable by the admin, nothing changed without asking")
p.cont("adm", 40, 170, 400, 1000, "Admins only", F_HOME, NAVY)
p.box("a_tg", 70, 230, 340, 150, "<b>Owner's chat in the app</b><br>request cards: [Approve] [Reject] [Why?] [Later]<br>instructions in plain words<br>approve with the second check")
p.box("a_web", 70, 440, 340, 170, "<b>Admin center</b><br>in the app and the web app<br>Spend · Alerts · Approvals<br>Settings · Agents · Incidents<br>second check: passkey or sign-in")
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
p.icon("c_out", "sqs", 1500, 1460, "SQS outbox → sender<br>the chat and push")
p.box("c_web", 1780, 1450, 400, 110, "<b>Alerts in the Admin center</b><br>Alert rows · badge · [Replay] on failed work")
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
p.line("c_rt", "c_out", "app · push", color=CRIMSON, pa=R, pb=Lf)
p.line("c_rt", "c_web", "Alert row", color=CRIMSON, pa=T, pb=T, kind="elbow", lpos=0.5)
pages.append(p)


# ---------------------------------------------------------------- 8 adding a record, and a correction in place (sequence, PlantUML)
# ARCHITECTURE 4.8 and 4.10 (MA-186): a draft writes nothing; Confirm commits exactly the hashed draft, and a Save in place
# commits a correction, both through the one write service, each change with its audit row in one transaction. The
# figures are household-v4.json's: Balanced at Fri 23 Oct's NAV, and Home, Reading corrected from 415,000 to 428,000.
# Lucid's sequence generator doubles an apostrophe inside a note and reads " as " in a group label as an alias, so the
# notes have no apostrophe and the labels no "as".
SEQUENCE ="""@startuml
title Adding a record through the chat, and correcting a figure in place (figures illustrative)
actor Member
participant "iOS app (React Native shell, SwiftUI core)" as app
participant "web app (SvelteKit PWA)" as web
participant "S3 documents (kept for good)" as s3
participant "API Gateway + api λ (api host)" as api
participant "SQS updates.fifo" as qin
participant "agent λ" as agent
participant "SQS work" as work
participant "worker λ (docs job)" as worker
participant "Claude (Anthropic API)" as claude #FCEED6
database "DynamoDB registry" as ddb
participant "SQS outbox.fifo + sender λ" as out
participant "stream log + stream λ (SSE on the api host)" as stream
autonumber
Member -> app : attaches factsheet.pdf in the chat
app -> api : asks for an upload link
api --> app : presigned PUT URL
app -> s3 : PUT factsheet.pdf
app -> api : POST /v1/chat/messages (client id, names the file)
api -> qin : lane = member, dedupe = client id
api --> app : 202 at once
qin -> agent : next message, in order
activate agent
agent -> ddb : file received: Document (factsheet, S3 key, sha256) + AuditEvent, one transaction
agent -> out : "Reading it now"
out -> stream : appended to the member's stream log
stream --> app : SSE to every open door
agent -> work : docs job (document_id)
deactivate agent
work -> worker : job, 5 tries, then DLQ
activate worker
worker -> claude : PDF + schema: name, ISIN, currency, charge, holdings
claude --> worker : JSON, a source line per field
worker -> ddb : PendingAction register_record (what was read, document_id, expires in 24 h)
worker -> out : what I read, unsure fields in amber; which account is it in? [ISA · Monzo] [GIA] [Cancel]
deactivate worker
out -> stream : appended to the stream log
stream --> app : SSE: the card and its chips
Member -> app : taps ISA · Monzo
app -> api : POST /v1/chat/actions (the chip, the flow id)
api -> qin : queue the tap
api --> app : acknowledged at once
qin -> agent : the tap, in order: the flow resumes
activate agent
agent -> agent : draft_record(oeic, fields): code types each value against the kind, says what is missing: the units
agent -> out : ask_user: "How many units do you hold? Type them, or send a screenshot of the valuation"
deactivate agent
out -> stream : appended to the stream log
stream --> app : SSE: the question
Member -> app : types "1,234.5 units"
app -> api : POST /v1/chat/messages
api -> qin : queue
qin -> agent : the answer, in order
activate agent
agent -> agent : draft_record again: complete; code values it at Fri 23 Oct's NAV, 1,234.5 × 18.57 = £22,925; the draft hashed in PendingAction
agent -> out : Confirm card: Balanced, in ISA · Monzo, Arun's, £22,925, the figures code computed [Confirm] [Edit] [Cancel]
deactivate agent
out -> stream : appended to the stream log
stream --> app : SSE: the Confirm card
Member -> app : taps Confirm
app -> api : POST /v1/chat/actions (Confirm, the draft's hash)
api -> qin : queue the tap
api --> app : acknowledged at once
qin -> agent : the tap, in order
activate agent
agent -> ddb : Instrument + AuditEvent (document_id) in one transaction with the Record, its opening Event and their AuditEvents: the write service commits exactly the hashed draft
agent -> out : "Saved: Balanced, £22,925" and records.changed
deactivate agent
out -> stream : appended to the stream log
stream --> app : SSE: the confirmation
stream --> web : SSE: records.changed, the laptop's dashboard moves
group Correction in place
Member -> web : taps Home, Reading's value, types 428,000
web --> Member : £415,000 → £428,000 [Save]
Member -> web : Save
web -> api : PATCH /v1/records/{id} (value 428,000; the figure shown, 415,000), the session cookie
activate api
api -> ddb : write service: value is editable on the property kind, a number in range; has the record moved since 415,000?
alt the record moved since the screen showed it
api --> web : refused, nothing written; the new figure is shown
else unchanged since the screen showed it
api -> ddb : correction Event + AuditEvent (via inline_edit, 415,000 → 428,000) in one transaction
api --> web : saved
api -> out : records.changed
out -> stream : appended to the stream log
stream --> app : SSE: records.changed, the phone's dashboard moves
end
deactivate api
end
note over agent, out : The Document and audit rows of a file are written when it arrives, before the docs job reads it, and stay whatever happens next (Cancel, an expired PendingAction, a failed read); the file opens from the Audit screen. A draft writes nothing: only Confirm, the tap on a check-in or a Save in place commits.
note over api, ddb : One write service, the same code behind Confirm in the agent and the PATCH in the api: it checks the change against the kind spec and writes the event with its audit row in one transaction.
note over out, stream : A device with no fresh Presence gets Apple push or Web Push instead; on opening, a door resumes from its last event (Last-Event-ID).
@enduml
"""


doc = {"version": 1, "pages": [pg.out() for pg in pages]}
# ARCHITECTURE 4.6 and MA-148: a file's Document row (with its audit row) is written when it arrives, before its docs
# job reads it, and only there: a Document written anywhere else (at Confirm) is refused, whatever the spelling, and so
# is a docs job with no Document row before it. Checked before anything is written (MA-161 review, rounds 1 and 2).
_seq, _last = SEQUENCE.splitlines(), -1
_TO_DB = re.compile(r"\bddb\b|DynamoDB")         # any arrow to or from the table, however it is drawn
_DOCS_JOB = re.compile(r"\bwork\b[^:]*:\s*docs job")
_DOC = re.compile(r"\bdocuments?\b", re.I)            # "Document", "the document row", never document_id
for _i, _l in enumerate(_seq):
    if _TO_DB.search(_l) and _DOC.search(_l) and "file received" not in _l:
        sys.exit(f"sequence: line {_i + 1} writes a Document row somewhere other than when the file arrives")
    if _DOCS_JOB.search(_l):
        if not any(_TO_DB.search(x) and "file received" in x and _DOC.search(x) for x in _seq[_last + 1:_i]):
            sys.exit(f"sequence: the docs job at line {_i + 1} reads a file with no Document row written before it")
        _last = _i
if _last < 0:
    sys.exit("sequence: no docs job")

json.dump(doc, open(sys.argv[1], "w"), indent=1)
print("pages", len(pages), "shapes", sum(len(pg.shapes) for pg in pages), "lines", sum(len(pg.lines) for pg in pages))
if len(sys.argv) > 2:
    open(sys.argv[2], "w").write(SEQUENCE)
    print("sequence", sys.argv[2])
