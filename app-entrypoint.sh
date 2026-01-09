#!/bin/sh

set -exu

. venv/bin/activate
# exec venv/bin/celery -A apps.hello.tasks beat &
# exec venv/bin/celery -A apps.hello.tasks worker --loglevel=info &
exec py4web run --password_file password.txt --host 0.0.0.0 --port 8000 apps

# Execute the command passed to the script
# exec py4web run "$@"
