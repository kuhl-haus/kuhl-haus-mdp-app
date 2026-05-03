[![License](https://img.shields.io/github/license/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/blob/mainline/LICENSE.txt)
[![Build Images](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/build-images.yml/badge.svg)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/build-images.yml)
[![GitHub Release](https://img.shields.io/github/v/release/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/releases)
[![CodeQL Advanced](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/codeql.yml)
[![GitHub issues](https://img.shields.io/github/issues/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/pulls)
[![Frontend Coverage](https://codecov.io/gh/kuhl-haus/kuhl-haus-mdp-app/branch/mainline/graph/badge.svg?flag=frontend)](https://codecov.io/gh/kuhl-haus/kuhl-haus-mdp-app)
[![Backend Coverage](https://codecov.io/gh/kuhl-haus/kuhl-haus-mdp-app/branch/mainline/graph/badge.svg?flag=backend)](https://codecov.io/gh/kuhl-haus/kuhl-haus-mdp-app)

# kuhl-haus-mdp-app

Service control plane and web application for the Kuhl Haus Market Data Platform.

## Overview

The frontend application — also referred to as the **Service Control Plane (SCP)** — hosts the client single-page application and manages the data plane at runtime. It is built on [py4web](https://py4web.com/) and provides OAuth-secured access to the market data dashboard.

**Implemented Features:**

- Authentication and authorization
- Serve static and dynamic content via py4web
- Serve SPA to authenticated clients
- Inject authentication token and WDS URL into SPA environment for authenticated access to the Widget Data Service

**Planned Features:**

- Control plane for managing application components at runtime
- API for programmatic access to service controls and instrumentation

The SCP requires access to the data plane network for API access to data plane components.

## Container Image

The container image published by this repository is intended for **local development or demonstration purposes only**. The default dashboard password is `changeme` and cannot be changed because the image is immutable.

To create a production image with your own dashboard password:

1. Generate a password hash:

   ```bash
   python3 -c "from pydal.validators import CRYPT; open('password.txt','w').write(str(CRYPT()(input('password:'))[0]))"
   ```

2. Build a custom image:

   ```dockerfile
   ARG BASE_IMAGE=ghcr.io/kuhl-haus/kuhl-haus-mdp-app-server:latest
   FROM ${BASE_IMAGE}
   ARG user=py4web
   USER root
   COPY password.txt /home/$user/
   RUN chown "${user}:${user}" /home/$user/password.txt
   EXPOSE 8000
   USER $user
   WORKDIR /home/$user/
   ENTRYPOINT ["/home/py4web/app-entrypoint.sh"]
   ```

See the [py4web run command documentation](https://py4web.com/_documentation/static/en/chapter-03.html#run-command-option) for details on the `--password-file` option.

## Code Organization

The platform consists of four main packages:

- **Market data processing library** ([kuhl-haus-mdp](https://github.com/kuhl-haus/kuhl-haus-mdp)) — Core library with shared data processing logic
- **Backend Services** ([kuhl-haus-mdp-servers](https://github.com/kuhl-haus/kuhl-haus-mdp-servers)) — Market data listener, processor, and widget service
- **Frontend Application** ([kuhl-haus-mdp-app](https://github.com/kuhl-haus/kuhl-haus-mdp-app)) — Web-based user interface and API *(this repo)*
- **Deployment Automation** ([kuhl-haus-mdp-deployment](https://github.com/kuhl-haus/kuhl-haus-mdp-deployment)) — Docker Compose, Ansible playbooks and Kubernetes manifests for environment provisioning

## Documentation

For architecture details, component descriptions, and API reference, see the
[full documentation on Read the Docs](https://kuhl-haus-mdp.readthedocs.io/en/latest/).

## Additional Resources

📖 **Blog Posts:**

All of my blog posts related to Kuhl Haus MDP are tagged with `#kuhl-haus-mdp` and listed in reverse chronological order at [oldschool-engineer.dev/tags/#kuhl-haus-mdp](https://oldschool-engineer.dev/tags/#kuhl-haus-mdp).

The 5-part series where it all began:

- [Part 1: Why I Built It](https://oldschool-engineer.dev/side%20projects/2026/01/16/what-i-built-after-quitting-amazon-spoiler-its-a-stock-scanner.html)
- [Part 2: How to Run It](https://oldschool-engineer.dev/side%20projects/2026/01/21/what-i-built-after-quitting-amazon-spoiler-its-a-stock-scanner-part-2.html)
- [Part 3: How to Deploy It](https://oldschool-engineer.dev/infrastructure/2026/01/31/what-i-built-after-quitting-amazon-spoiler-its-a-stock-scanner-part-3.html)
- [Part 4: Evolution from Prototype to Production](https://oldschool-engineer.dev/software%20engineering/2026/02/11/what-i-built-after-quitting-amazon-spoiler-its-a-stock-scanner-part-4.html)
- [Part 5: Wave 1 Complete: Bugs, Bottlenecks, and Breaking 1,000 msg/s](https://oldschool-engineer.dev/software%20engineering/2026/02/23/what-i-built-after-quitting-amazon-spoiler-its-a-stock-scanner-part-5.html)
