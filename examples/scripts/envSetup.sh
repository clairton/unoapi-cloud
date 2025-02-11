#!/bin/bash

# Função para gerar senha aleatória
generate_random_string() {
    tr -dc A-Za-z0-9 </dev/urandom | head -c 20
}

# Função para validar o domínio
validate_domain() {
    if echo "$1" | grep -qE '^[a-zA-Z0-9.-]+$'; then
        return 0
    else
        echo "Domínio inválido. Deve conter apenas caracteres alfanuméricos, pontos e hífens."
        return 1
    fi
}

# Perguntas e configurações

echo "Qual o nome da rede Docker padrão?"
read dockernetwork
dockernetwork=${dockernetwork:-"network"}


echo "Digite o email para os certificados: "
read letsencrypt_mail
letsencrypt_mail=${letsencrypt_mail:-"user@gmail.com"}

echo "Digite o domínio principal:"
read domain

# Validar domínio
while ! validate_domain "$domain"; do
    echo "Digite um domínio válido:"
    read domain
done

echo "Subdomínio do MinIO Console (padrão: portainer.$domain):"
read portainer_subdomain
portainer_subdomain=${portainer_subdomain:-"portainer.$domain"}

echo "Subdomínio do MinIO Console (padrão: console.minio.$domain):"
read minioweb_subdomain
minioweb_subdomain=${minioweb_subdomain:-"console.minio.$domain"}

echo "Subdomínio do MinIO API (padrão: api.minio.$domain):"
read minioapi_subdomain
minioapi_subdomain=${minioapi_subdomain:-"api.minio.$domain"}

echo "Subdomínio para o chatwoot (padrão: app.$domain):"
read chatwoot_subdomain
chatwoot_subdomain=${chatwoot_subdomain:-"app.$domain"}

echo "Subdomínio para o UnoAPI (padrão: unoapi.$domain):"
read unoapi_subdomain
unoapi_subdomain=${unoapi_subdomain:-"unoapi.$domain"}

echo "Subdomínio para o Redis (padrão: redis.$domain):"
read redis_subdomain
redis_subdomain=${redis_subdomain:-"redis.$domain"}

echo "Subdomínio para o RabbitMQ (padrão: rabbitmq.$domain):"
read rabbitmq_subdomain
rabbitmq_subdomain=${rabbitmq_subdomain:-"rabbitmq.$domain"}

echo "Usuário do PostgreSQL:"
read postgres_user
postgres_user=${postgres_user:-"postgres"}
echo "Senha do PostgreSQL (deixe em branco para gerar automaticamente):"
read postgres_pass
postgres_pass=${postgres_pass:-$(generate_random_string)}

echo "Usuário do RabbitMQ:"
read rabbitmq_user
rabbitmq_user=${rabbitmq_user:-"rabbitmq_user"}
echo "Senha do RabbitMQ (deixe em branco para gerar automaticamente):"
read rabbitmq_pass
rabbitmq_pass=${rabbitmq_pass:-$(generate_random_string)}

echo "Usuário do Redis (padrão: default):"
read redis_user
redis_user=${redis_user:-"default"}

echo "Senha do Redis (deixe em branco para gerar automaticamente):"
read redis_pass
redis_pass=${redis_pass:-$(generate_random_string)}

echo "Usuário do MinIO:"
read minio_user
minio_user=${minio_user:-"minio_user"}
echo "Senha do MinIO (deixe em branco para gerar automaticamente):"
read minio_pass
minio_pass=${minio_pass:-$(generate_random_string)}

echo "Token de autenticação do UnoAPI (deixe em branco para gerar automaticamente):"
read unoapi_auth_token
unoapi_auth_token=${unoapi_auth_token:-$(generate_random_string)}

# Confirmar se as variáveis estão corretas
echo ""
echo "Por favor, revise as configurações:"
echo ""
echo "E-mail para os certificados: $letsencrypt_mail"
echo "Domínio: $domain"
echo "Subdomínio Portainer: $portainer_subdomain"
echo "Subdomínio Chatwoot: $chatwoot_subdomain"
echo "Subdomínio UnoAPI: $unoapi_subdomain"
echo "Subdomínio Redis: $redis_subdomain"
echo "Subdomínio RabbitMQ: $rabbitmq_subdomain"
echo "Usuário PostgreSQL: $postgres_user"
echo "Usuário RabbitMQ: $rabbitmq_user"
echo "Usuário Redis: $redis_user"
echo "Usuário MinIO: $minio_user"
echo "Token UnoAPI: $unoapi_auth_token"
echo "Subdomínio MinIO Console: $minioweb_subdomain"
echo "Subdomínio MinIO API: $minioapi_subdomain"
echo "Rede Docker: $dockernetwork"
echo ""
echo "Pressione 'y' para confirmar ou qualquer outra tecla para editar."

read confirm
if [ "$confirm" != "y" ]; then
    echo "Você pode editar o arquivo .env diretamente ou reiniciar o script."
    exit 1
fi

# Criar o arquivo de envs
cat > .env <<EOL
PORTAINER_SUBDOMAIN=$portainer_subdomain
LETSENCRYPT_MAIL=$letsencrypt_mail
DOMAIN=$domain
CHATWOOT_SUBDOMAIN=$chatwoot_subdomain
UNOAPI_SUBDOMAIN=$unoapi_subdomain
REDIS_SUBDOMAIN=$redis_subdomain
RABBITMQ_SUBDOMAIN=$rabbitmq_subdomain
POSTGRES_USER=$postgres_user
POSTGRES_PASS=$postgres_pass
RABBITMQ_USER=$rabbitmq_user
RABBITMQ_PASS=$rabbitmq_pass
REDIS_USER=$redis_user
REDIS_PASS=$redis_pass
MINIO_USER=$minio_user
MINIO_PASS=$minio_pass
UNOAPI_AUTH_TOKEN=$unoapi_auth_token
MINIOWEB_SUBDOMAIN=$minioweb_subdomain
MINIOAPI_SUBDOMAIN=$minioapi_subdomain
DOCKERNETWORK=$dockernetwork
EOL

echo "Arquivo .env gerado com sucesso."

# Carregar as variáveis de ambiente do .env
export $(grep -v '^#' .env | xargs)

# Baixar o arquivo docker-compose-model.yaml do GitHub
curl -fsSL https://raw.githubusercontent.com/rodrigo-gmengue/unoapi-cloud/refs/heads/tutorials/examples/scripts/docker-compose-model.yaml -o docker-compose-model.yaml

# Substituir as variáveis no arquivo docker-compose-model.yaml
envsubst < docker-compose-model.yaml > docker-compose.yaml

echo "Arquivo docker-compose.yaml gerado com sucesso."
