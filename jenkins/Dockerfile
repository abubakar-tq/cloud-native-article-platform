FROM jenkins/jenkins:lts

USER root


RUN apt-get update && \
    apt-get install -y \
        ca-certificates \
        curl \
        unzip && \
    rm -rf /var/lib/apt/lists/*

# ============================================================
# Terraform
# ============================================================

RUN curl -fsSL -o terraform.zip https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_amd64.zip && \
    unzip terraform.zip -d /usr/local/bin && \
    rm terraform.zip

# ============================================================
# kubectl
# ============================================================

RUN curl -fsSL -o /usr/local/bin/kubectl https://dl.k8s.io/release/v1.30.5/bin/linux/amd64/kubectl && \
    chmod +x /usr/local/bin/kubectl

# ============================================================
# Docker CLI
# ============================================================

RUN curl -fsSL -o docker.tgz https://download.docker.com/linux/static/stable/x86_64/docker-27.3.1.tgz && \
    tar -xzf docker.tgz docker/docker -O > /usr/local/bin/docker && \
    chmod +x /usr/local/bin/docker && \
    rm docker.tgz

# ============================================================
# Docker Compose plugin
# ============================================================

RUN mkdir -p /usr/local/lib/docker/cli-plugins && \
    curl -fsSL -o /usr/local/lib/docker/cli-plugins/docker-compose \
        https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 && \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# ============================================================
# Verify
# ============================================================

RUN terraform version && \
    kubectl version --client && \
    docker --version && \
    docker compose version

USER jenkins
