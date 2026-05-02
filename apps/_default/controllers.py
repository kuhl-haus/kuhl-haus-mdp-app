"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""
import os
import sys
from importlib.metadata import version

from py4web import action, Cache

from .common import (
    T,
    auth,
    db,
    session,
)
from .settings import (
    APP_FOLDER,
    FINLIGHT_API_KEY,
    MASSIVE_API_KEY,
    WDS_API_KEY,
    WDS_ENDPOINT,
)

cache = Cache(size=100)


@cache.memoize(expiration=3600)
def get_versions():
    try:
        py4web_version = version("py4web")
    except Exception as e:
        print(f"Error determining version: {repr(e)}", file=sys.stderr)
        py4web_version = "Unknown"

    try:
        version_path = os.path.join(APP_FOLDER, 'version.txt')
        with open(version_path, 'r') as f:
            image_version = f.read().strip()
        if image_version == 'latest':
            raise ValueError("Invalid version 'latest' detected in version.txt")
    except Exception:
        image_version = os.environ.get('IMAGE_VERSION', 'Unknown')

    return {
        "py4web version:": py4web_version,
        "image version:": image_version,
        "image source:": os.environ.get('CONTAINER_IMAGE', 'Unknown')
    }


version_info = get_versions()


@action("index")
@action.uses("index.html", auth, T, session)
def index():
    user = auth.get_user()
    if user:
        message = T("Hello {first_name}").format(**user)
        return dict(
            message=message,
            version_info=version_info
        )
    else:
        message = T("Hello there!  Login or signup to get started.")
        return dict(message=message, version_info=version_info)


@action("app")
@action.uses("app.html", db, session, auth.user)
def app():
    return dict(
        app_version=version_info["image version:"],
    )


# Market data enrichment proxy (api package)
from .api import market_data  # noqa: F401 — registers routes

# API endpoint to validate session and get API key
@action('api/get_config', method='GET')
@action.uses(db, session, auth.user)
def get_config():
    """Secure endpoint that requires authentication"""

    return dict(
        api_key=WDS_API_KEY,
        ws_endpoint=WDS_ENDPOINT,
        massive_api_key=MASSIVE_API_KEY,
        finlight_api_key=FINLIGHT_API_KEY,
        app_version=version_info.get("image version:") if version_info else None,
    )
