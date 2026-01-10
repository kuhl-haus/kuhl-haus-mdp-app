"""
This is an optional file that defines app level settings:
- database settings
- session settings
- i18n settings
"""

import os

from py4web.core import required_folder


# Widget Data Service settings
WDS_ENDPOINT = os.environ.get("WDS_ENDPOINT", f"ws://localhost:4020/ws")  # Widget Data Service Endpoint
WDS_API_KEY = os.environ.get("WDS_API_KEY", "secret")  # Widget Data Service API KEY

# mode (default or development)
MODE = os.environ.get("PY4WEB_MODE")

# db settings
PYDAL_URI = os.environ.get("PYDAL_URI", "sqlite://storage.db")
APP_FOLDER = os.path.dirname(__file__)
APP_NAME = os.path.split(APP_FOLDER)[-1]

# DB_FOLDER:    Sets the place where migration files will be created
#               and is the store location for SQLite databases
DB_FOLDER = required_folder(APP_FOLDER, "databases")
DB_URI = PYDAL_URI
DB_POOL_SIZE = 1
DB_MIGRATE = True
DB_FAKE_MIGRATE = False

# location where static files are stored:
STATIC_FOLDER = required_folder(APP_FOLDER, "static")

# location where to store uploaded files:
UPLOAD_FOLDER = required_folder(APP_FOLDER, "uploads")

# send verification email on registration
VERIFY_EMAIL = MODE != "development"

# complexity of the password 0: no constraints, 50: safe!
PASSWORD_ENTROPY = 0 if MODE == "development" else 50

# account requires to be approved ?
REQUIRES_APPROVAL = False

# auto login after registration
# requires False VERIFY_EMAIL & REQUIRES_APPROVAL
LOGIN_AFTER_REGISTRATION = False
LOGIN_EXPIRATION_TIME = os.environ.get("LOGIN_EXPIRATION_TIME", 604800)  # Default: 1 week

# ALLOWED_ACTIONS in API / default Forms:
# ["all"]
# ["login", "logout", "request_reset_password", "reset_password", \
#  "change_password", "change_email", "profile", "config", "register",
#  "verify_email", "unsubscribe"]
# Note: if you add "login", add also "logout"
ALLOWED_ACTIONS = ["all"]

# email settings
SMTP_HOST = os.environ.get("SMTP_HOST", None)
SMTP_PORT = os.environ.get("SMTP_PORT", 465)
SMTP_SERVER = f"{SMTP_HOST}:{SMTP_PORT}" if SMTP_HOST else None
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", None)
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", None)
SMTP_LOGIN = f"{SMTP_USERNAME}:{SMTP_PASSWORD}" if SMTP_USERNAME and SMTP_PASSWORD else None
SMTP_SENDER = os.environ.get("SMTP_SENDER_EMAIL", "you@example.com")
SMTP_SSL = os.environ.get("SMTP_SSL", True)
SMTP_TLS = os.environ.get("SMTP_TLS", True)

# session settings
SESSION_TYPE = "cookies"
SESSION_SECRET_KEY = os.environ.get("PY4WEB_SESSION_SECRET_KEY", None)
MEMCACHE_CLIENTS = ["127.0.0.1:11211"]
REDIS_SERVER = "localhost:6379"

# logger settings
LOGGERS = [
    "warning:stdout"
]  # syntax "severity:filename:format" filename can be stderr or stdout

# Disable default login when using OAuth
DEFAULT_LOGIN_ENABLED = os.environ.get("DEFAULT_LOGIN_ENABLED", False)

# single sign on Google (will be used if provided)
OAUTH2GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", None)
OAUTH2GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", None)

# Single sign on Google, with stored credentials for scopes (will be used if provided).
# set it to something like os.path.join(APP_FOLDER, "private/credentials.json"
OAUTH2GOOGLE_SCOPED_CREDENTIALS_FILE = None

# single sign on Okta (will be used if provided. Please also add your tenant
# name to py4web/utils/auth_plugins/oauth2okta.py. You can replace the XXX
# instances with your tenant name.)
OAUTH2OKTA_CLIENT_ID = None
OAUTH2OKTA_CLIENT_SECRET = None

# single sign on Google (will be used if provided)
OAUTH2FACEBOOK_CLIENT_ID = None
OAUTH2FACEBOOK_CLIENT_SECRET = None

# single sign on GitHub (will be used if provided)
OAUTH2GITHUB_CLIENT_ID = None
OAUTH2GITHUB_CLIENT_SECRET = None

# enable PAM
USE_PAM = False

# enable LDAP
USE_LDAP = False
LDAP_SETTINGS = {
    "mode": "ad",  # Microsoft Active Directory
    "server": "mydc.domain.com",  # FQDN or IP of one Domain Controller
    "base_dn": "cn=Users,dc=domain,dc=com",  # base dn, i.e. where the users are located
}

# i18n settings
T_FOLDER = required_folder(APP_FOLDER, "translations")

# Scheduler settings
USE_SCHEDULER = os.environ.get("PY4WEB_USE_SCHEDULER", False)
SCHEDULER_MAX_CONCURRENT_RUNS = 8

# Celery settings (alternative to the build-in scheduler)
USE_CELERY = False
CELERY_BROKER = "redis://localhost:6379/0"

# try import private settings
try:
    from .settings_private import *  # type: ignore[reportMissingImports]
except (ImportError, ModuleNotFoundError):
    pass
