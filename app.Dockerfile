ARG BASE_IMAGE=ghcr.io/kuhl-haus/kuhl-haus-mdp-app-server-base:latest

FROM node:26-alpine AS frontend-builder

USER root

WORKDIR /app/client

# Copy frontend dependencies
COPY client/package*.json ./
RUN npm install
# RUN npm ci --only=production

# Copy frontend source
COPY client/ ./

# Build Vue.js application
RUN npm run build

FROM ${BASE_IMAGE}

ARG user=py4web

ARG IMAGE_VERSION=latest

USER root

COPY . /home/$user/

RUN python3 -m venv venv && \
    . venv/bin/activate && \
    python3 -m pip install --no-cache-dir -e .

#COPY app-entrypoint.sh /home/$user/
RUN chmod +x /home/$user/app-entrypoint.sh
RUN chown "${user}:${user}" /home/$user/app-entrypoint.sh

#COPY apps /home/$user/apps
RUN echo ${IMAGE_VERSION} > /home/$user/apps/_default/version.txt
# Default app volumes
RUN mkdir -p /home/$user/apps/_default/databases/
RUN mkdir -p /home/$user/apps/_default/uploads/

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/client/dist/assets  /home/$user/apps/_default/static/dist/

RUN chown "${user}:${user}" -R /home/$user/apps

COPY password.txt /home/$user/
RUN chown "${user}:${user}" /home/$user/password.txt

EXPOSE 8000

USER $user
WORKDIR /home/$user/
ENTRYPOINT ["/home/py4web/app-entrypoint.sh"]

