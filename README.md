[![License](https://img.shields.io/github/license/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/blob/mainline/LICENSE.txt)
[![CodeQL Advanced](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/codeql.yml)
[![Build Images](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/build-images.yml/badge.svg)](https://github.com/kuhl-haus/kuhl-haus-mdp-app-servers/actions/workflows/build-images.yml)
[![GitHub last commit](https://img.shields.io/github/last-commit/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/branches)
[![GitHub issues](https://img.shields.io/github/issues/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/pulls)

[//]: # ([![release]&#40;https://img.shields.io/github/v/release/kuhl-haus/kuhl-haus-mdp-app?style=flat-square&#41;]&#40;https://github.com/kuhl-haus/kuhl-haus-mdp-app/releases&#41;)

# kuhl-haus-mdp-app
Market data processing service control plane and web application


## Overview

The Kuhl Haus Market Data Platform (MDP) is a distributed system for collecting, processing, and serving real-time market data. Built on Kubernetes and leveraging microservices architecture, MDP provides scalable infrastructure for financial data analysis and visualization.

### Architecture

The platform consists of four main packages:
- **Market data processing library** ([`kuhl-haus-mdp`](https://github.com/kuhl-haus/kuhl-haus-mdp)) - Core library with shared data processing logic
- **Backend Services** ([`kuhl-haus-mdp-servers`](https://github.com/kuhl-haus/kuhl-haus-mdp-servers)) - Market data listener, processor, and widget service
- **Frontend Application** ([`kuhl-haus-mdp-app`](https://github.com/kuhl-haus/kuhl-haus-mdp-app)) - Web-based user interface and API
- **Deployment Automation** ([`kuhl-haus-mdp-deployment`](https://github.com/kuhl-haus/kuhl-haus-mdp-deployment)) - Docker Compose, Ansible playbooks and Kubernetes manifests for environment provisioning

### Key Features

- Real-time market data ingestion and processing
- Scalable microservices architecture
- Automated deployment with Ansible and Kubernetes
- Multi-environment support (development, staging, production)
- OAuth integration for secure authentication
- Redis-based caching layer for performance

### Additional Resources

📖 **Blog Series:**
- [Part 1: Why I Built It](https://the.oldschool.engineer/what-i-built-after-quitting-amazon-spoiler-its-a-stock-scanner-28fc3b6d9be0)
- [Part 2: How to Run It](https://the.oldschool.engineer/what-i-built-after-quitting-amazon-spoiler-its-a-stock-scanner-part-2-94e445914951)
- [Part 3: How to Deploy It](https://the.oldschool.engineer/what-i-built-after-quitting-amazon-spoiler-its-a-stock-scanner-part-3-eab7d9bbf5f7)
- [Part 4: Evolution from Prototype to Production](https://the.oldschool.engineer/what-i-built-after-quitting-amazon-spoiler-its-a-stock-scanner-part-4-408779a1f3f2)

## Frontend Application

The frontend application is also referred to as the Service Control Plane (SCP).  Its primary function is to host the client application and manage the data plane at runtime.  Currently, the minimum features required to launch the SPA are implemented with plans to implement features for managing the data plane in future development waves.  Which means, it's pretty much just the frontend host right now because the control plane functionality is vaporware.

**Implemented Features**:
1. Authentication and authorization
2. Serve static and dynamic content via py4web
3. Serve SPA to authenticated clients
4. Injects authentication token and WDS url into SPA environment for authenticated access to WDS

**Planned Features**:
1. Control plane for managing application components at runtime
2. API for programmatic access to service controls and instrumentation.

The SCP requires access to the data plane network for API access to data plane components.


### Application Host

The container image published by this repository should only be used for local development or demonstration purposes. The default dashboard password is `changeme` and, ironically, cannot be changed because the image is immutable.  Therefore, you should create your own image, overwriting the default `password.txt` file.  

The application host runs on top of py4web.  Access to the dashboard is secured with a password created during setup. However, to create a runnable container image, the setup step must be skipped and the dashboard password must be provided via the `--password-file` option to the `py4web run` command.  

https://py4web.com/_documentation/static/en/chapter-03.html#run-command-option



Generate dashboard password hash:

```aiignore
python3 -c "from pydal.validators import CRYPT; open('password.txt','w').write(str(CRYPT()(input('password:'))[0]))"
```

Then create a new image using the following Dockerfile:

```aiignore

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
