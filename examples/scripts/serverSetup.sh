#!/bin/bash

apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg wget jp lsb-release

install -m 0755 -d /etc/apt/keyrings

apt purge -y docker-* 

if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [ "$ID" = "debian" ]; then

        echo "Instalação em ambiente Debian"
        curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/docker.gpg
        chmod a+r /etc/apt/trusted.gpg.d/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/trusted.gpg.d/docker.gpg] https://download.docker.com/linux/debian \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    elif [ "$ID" = "ubuntu" ]; then
        echo "Instalação em ambiente UBUNTU"
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
        chmod a+r /etc/apt/keyrings/docker.asc
        echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list
    fi
fi

apt update && apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

echo "Digite o nome para a rede da sua instalação docker:"
read dockerNetwork
dockerNetwork=${dockerNetwork:-"network"}

docker network create $dockerNetwork

echo "Ambiente configurado com sucesso!"