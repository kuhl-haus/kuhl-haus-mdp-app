[![License](https://img.shields.io/github/license/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/blob/mainline/LICENSE.txt)
[![release](https://img.shields.io/github/v/release/kuhl-haus/kuhl-haus-mdp-app?style=flat-square)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/releases)
[![Build Images](https://github.com/kuhl-haus/kuhl-haus-mdp-app-servers/actions/workflows/build-images.yml/badge.svg)](https://github.com/kuhl-haus/kuhl-haus-mdp-app-servers/actions/workflows/build-images.yml)
[![CodeQL Advanced](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/actions/workflows/codeql.yml)
[![GitHub last commit](https://img.shields.io/github/last-commit/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/branches)
[![GitHub issues](https://img.shields.io/github/issues/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/kuhl-haus/kuhl-haus-mdp-app)](https://github.com/kuhl-haus/kuhl-haus-mdp-app/pulls)

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
