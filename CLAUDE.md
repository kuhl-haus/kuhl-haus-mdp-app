# CLAUDE.md — kuhl-haus-mdp-app

## Overview

Service Control Plane (SCP) and web application for the Kuhl Haus Market Data Platform. Built on [py4web](https://py4web.com/), it provides OAuth-secured access to the market data dashboard and serves the client single-page application (SPA) to authenticated users.

**Platform documentation:** https://kuhl-haus-mdp.readthedocs.io

## Platform Context

**Platform repositories:**
- **kuhl-haus-mdp** — Core library
- **kuhl-haus-mdp-servers** — Data plane server entry points and Docker images
- **kuhl-haus-mdp-app** *(this repo)* — Service Control Plane web application
- **kuhl-haus-mdp-deployment** — Kubernetes/Ansible deployment automation

## Architecture

The SCP is the only platform component with external network access. It:

1. Authenticates users via OAuth
2. Serves the SPA to authenticated clients
3. Injects the WDS URL and auth token into the SPA environment for direct Widget Data Service access
4. (Planned) Provides a runtime control plane API for managing data plane components

The SCP requires access to the data plane network for API communication with data plane components.

**Implemented features:**
- Authentication and authorization (OAuth)
- Static and dynamic content serving via py4web
- SPA delivery to authenticated clients
- WDS URL + auth token injection into SPA environment

**Planned features:**
- Runtime control plane for managing data plane components
- Programmatic API for service controls and instrumentation

## Code Organization

```
apps/
├── _dashboard/           # py4web dashboard application (admin interface)
└── mdp/                  # MDP control plane application (if present)
app.Dockerfile            # Container image build
app-entrypoint.sh         # Container entrypoint script
```

**Languages:** JavaScript (frontend SPA) + Python (py4web backend)  
**Backend framework:** [py4web](https://py4web.com/)  
**Authentication:** OAuth

## Container Image

The published image at `ghcr.io/kuhl-haus/kuhl-haus-mdp-app-server` is for **local development and demonstration only**. The default password is `changeme` and cannot be changed in the base image (immutable).

For a production image with a custom password:

```bash
# 1. Generate password hash
python3 -c "from pydal.validators import CRYPT; open('password.txt','w').write(str(CRYPT()(input('password:'))[0]))"

# 2. Build custom image
docker build -t my-mdp-app - <<EOF
ARG BASE_IMAGE=ghcr.io/kuhl-haus/kuhl-haus-mdp-app-server:latest
FROM \${BASE_IMAGE}
ARG user=py4web
USER root
COPY password.txt /home/\$user/
RUN chown "\${user}:\${user}" /home/\$user/password.txt
EXPOSE 8000
USER \$user
WORKDIR /home/\$user/
ENTRYPOINT ["/home/py4web/app-entrypoint.sh"]
EOF
```

See the [py4web run command documentation](https://py4web.com/_documentation/static/en/chapter-03.html#run-command-option) for `--password-file` details.

## CI/CD (GitHub Actions)

| Workflow | Trigger | Purpose |
|---|---|---|
| `build-images.yml` | push/tag on mainline | Build and push Docker images to GHCR |
| `codeql.yml` | push/PR | CodeQL security analysis |

## Branch and Merge Conventions

- **Default branch:** `mainline`
- **Squash merge only** — org-level enforcement; merge commits and rebase are disabled
- All PRs target `mainline`; use feature branches for all changes
- Version tags drive Docker image releases — tag format: `vX.Y.Z`
