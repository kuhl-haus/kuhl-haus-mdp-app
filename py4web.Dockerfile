ARG BASE_IMAGE=ubuntu:latest
FROM ${BASE_IMAGE}

RUN apt update && \
    apt install -y git locales locales-all python3 python3-pip python3-venv memcached && \
    service memcached restart

ARG user=py4web
RUN groupadd -r -g 999 $user && \
    useradd -m -r -g $user -u 999 $user

COPY requirements.txt /home/$user/

RUN chown "${user}:${user}" -R /home/$user/

USER $user
WORKDIR /home/$user/

RUN python3 -m venv venv && \
    . venv/bin/activate && \
    python3 -m pip install -r requirements.txt -U

