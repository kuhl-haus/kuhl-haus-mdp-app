[![License](https://img.shields.io/github/license/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/blob/mainline/LICENSE.txt)
[![CodeQL Advanced](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/codeql.yml)
[![Build Images](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/build-images.yml/badge.svg)](https://github.com/kuhl-haus/kuhl-haus-mdp-app-servers/actions/workflows/build-images.yml)
[![GitHub last commit](https://img.shields.io/github/last-commit/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/branches)
[![GitHub issues](https://img.shields.io/github/issues/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/pulls)

[//]: # ([![release]&#40;https://img.shields.io/github/v/release/kuhl-haus/kuhl-haus-mdp-app?style=flat-square&#41;]&#40;https://github.com/kuhl-haus/kuhl-haus-mdp-app/releases&#41;)

# kuhl-haus-mdp-app
Market data processing service control plane and web application


## Setup

### Application Host Dashboard

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