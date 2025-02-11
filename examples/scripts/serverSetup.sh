#!/bin/bash

# Atualizar os pacotes do sistema
apt-get update && apt-get upgrade -y
apt-get install ca-certificates curl gnupg nmon wget jp htop -y 

# Instalar a chave GPG do Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Adicionar o repositório Docker para Debian ou Ubuntu
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "debian" ]]; then
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
        $VERSION_CODENAME stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    elif [[ "$ID" == "ubuntu" ]]; then
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    fi
fi

# Atualizar o repositório e instalar o Docker
apt-get update && apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

echo "Digite o nome para a rede da sua instalação docker:"
read dockerNetwork
dockerNetwork=${dockerNetwork:-"network"}

docker network create $dockerNetwork