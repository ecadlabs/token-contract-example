#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

FROM golang:latest as builder

# Now for the actual clone and build.
RUN go get github.com/keybase/client/go/keybase
RUN go install -tags production github.com/keybase/client/go/keybase

FROM node:lts

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# The node image comes with a base non-root 'node' user, so the alternate
# user here is primarily for Linux scenarios where you need to match your local
# user UID/GID. See https://aka.ms/vscode-remote/containers/non-root-user.
ARG USERNAME=vscode
ARG USER_UID=1001
ARG USER_GID=$USER_UID

# Configure apt and install packages
RUN apt-get update \
    && apt-get -y install --no-install-recommends apt-utils dialog 2>&1 \ 
    #
    # Verify git and needed tools are installed
    && apt-get install -y git procps vim zsh software-properties-common lsb-release apt-transport-https ca-certificates curl gnupg-agent \
    && sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)" \
    && chsh -s $(which zsh) \
    # Remove outdated yarn from /opt and install via package 
    # so it can be easily updated via apt-get upgrade yarn
    && rm -rf /opt/yarn-* \
    && rm -f /usr/local/bin/yarn \
    && rm -f /usr/local/bin/yarnpkg \
    && apt-get install -y curl apt-transport-https lsb-release \
    && curl -sS https://dl.yarnpkg.com/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/pubkey.gpg | apt-key add - 2>/dev/null \
    && echo "deb https://dl.yarnpkg.com/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && apt-get -y install --no-install-recommends yarn \
    #
    # Install tslint and typescript globally
    && npm install -g tslint typescript lerna @angular/cli rimraf pkgsign docusaurus-init bit-bin \

    && curl -fsSL https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/gpg | apt-key add - 2>/dev/null \
    && add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]') $(lsb_release -cs) stable" \
    && apt-get update \
    && apt-get install -y docker-ce-cli \ 
    && npm install -g --unsafe-perm @stove-labs/granary@pre-alpha \
    #
    # Create a non-root user to use if preferred - see https://aka.ms/vscode-remote/containers/non-root-user.
    && if [ "$USER_GID" != "1000" ]; then groupadd --gid $USER_GID $USERNAME; fi \
    && if [ "$USER_UID" != "1000" ]; then useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME; fi \
    # [Optional] Uncomment the next four lines to add sudo support
    # && apt-get install -y sudo \
    # && if [ "$USER_UID" != "1000" ]; then echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME; fi \
    # && echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node \
    # && chmod 0440 /etc/sudoers.d/$USERNAME \
    #
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /go/bin/keybase /usr/local/bin/keybase
ENV KEYBASE_ALLOW_ROOT=1
# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=