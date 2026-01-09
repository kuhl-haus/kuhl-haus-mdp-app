import os
import sys
from importlib.metadata import version
from py4web import action

try:
    __version__ = version("py4web")
except Exception as e:
    print(f"Error determining version: {repr(e)}", file=sys.stderr)
    __version__ = "Unknown"


@action('index')
def page():
    return {
            "status": "OK",
            "version": __version__,
            "image_version": os.environ.get('IMAGE_VERSION', 'Unknown'),
            "container_image": os.environ.get('CONTAINER_IMAGE', 'Unknown')
        }
