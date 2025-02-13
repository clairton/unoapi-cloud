#!/bin/bash

# gerar aleatória
generate_random_string() {
    tr -dc A-Za-z0-9 </dev/urandom | head -c 20
}

# validar o domínio
validate_domain() {
    if echo "$1" | grep -qE '^[a-zA-Z0-9.-]+$'; then
        return 0
    else
        echo "Domínio inválido. Deve conter apenas caracteres alfanuméricos, pontos e hífens."
        return 1
    fi
}


initialSetup(){
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

    echo "Subdomínio do Portainer (padrão: portainer.$domain):"
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

    echo "Usuário do PostgreSQL: (padrão: postgre)"
    read postgres_user
    postgres_user=${postgres_user:-"postgres"}
    echo "Senha do PostgreSQL (deixe em branco para gerar automaticamente):"
    read postgres_pass
    postgres_pass=${postgres_pass:-$(generate_random_string)}

    echo "Usuário do RabbitMQ (padrão: rabbitmq_user)"
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

    echo "Usuário do MinIO (padrão: minio_user) "
    read minio_user
    minio_user=${minio_user:-"minio_user"}
    echo "Senha do MinIO (deixe em branco para gerar automaticamente):"
    read minio_pass
    minio_pass=${minio_pass:-$(generate_random_string)}

    echo "Token de autenticação do UnoAPI (deixe em branco para gerar automaticamente):"
    read unoapi_auth_token
    unoapi_auth_token=${unoapi_auth_token:-$(generate_random_string)}

    echo "Nome do Banco de Dados para o Chatwoot (padrão: chatwoot_db):"
    read POSTGRES_DB
    POSTGRES_DB=${POSTGRES_DB:-"chatwoot_db"}

    # Confirmar se está OK
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
        echo ""
        initialSetup
        exit 0
    fi

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
POSTGRES_DB=$POSTGRES_DB
EOL

    echo "Arquivo .env gerado com sucesso."

    # Carregar as variáveis de ambiente do .env
    export $(grep -v '^#' .env | xargs)

    curl -fsSL https://raw.githubusercontent.com/clairton/unoapi-cloud/refs/heads/tutorials/examples/scripts/docker-model.yaml -o docker-model.yaml

    envsubst < docker-model.yaml > docker-compose.yaml

    curl -fsSL https://raw.githubusercontent.com/clairton/unoapi-cloud/refs/heads/tutorials/examples/scripts/apps-model.yaml -o apps-model.yaml

    envsubst < apps-model.yaml > apps-compose.yaml

    echo "Arquivo apps-compose.yaml gerado com sucesso."

    echo ""
    echo "Execute o comando docker compose up -d para iniciar os serviços!"
    rm docker-model.yaml apps-model.yaml
    setup
    exit 0
}

minio_setup() {
    echo "Iniciando a configuração do MinIO..."
    echo "Digite a região configurada no MinIO:"
    read MINIO_REGION
    echo "Digite o nome do bucket para o UnoAPI:"
    read UNOAPI_BUCKET
    echo "Digite o Access Key do MinIO:"
    read MINIO_ACCESS_KEY
    echo "Digite o Secret Key do MinIO:"
    read MINIO_SECRET_KEY
    echo "Digite o nome do bucket para o Chatwoot:"
    read CW_BUCKET

    cat >> .env <<EOL
MINIO_REGION=$MINIO_REGION
UNOAPI_BUCKET=$UNOAPI_BUCKET
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
CW_BUCKET=$CW_BUCKET
EOL

    echo "Variáveis adicionadas ao .env com sucesso."

    setup
    exit 0
    
}

genUnoapiStack() {

    REPO_OWNER="clairton"
    REPO_NAME="unoapi-cloud"

    # Obtém a última tag
    LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/tags" | jq -r '.[0].name' | cut -c2-)

    # Verifica se encontrou uma tag
    if [ -z "$LATEST_TAG" ] || [ "$LATEST_TAG" = "null" ]; then
        echo "Nenhuma tag encontrada no repositório remoto."
        exit 1
    fi

    echo "Você quer Gerar uma stack para a versão $LATEST_TAG da unoapi?"
    echo "Para confirmar as versões disponíves, utilize este link: https://hub.docker.com/r/clairton/unoapi-cloud/tags

    Se Deseja a versão $LATEST_TAG: Apenas tecle Enter, 
    Caso Deseje outra Versão: Digite-a para utilizar"
    read unoapi_version
    unoapi_version=${unoapi_version:-$LATEST_TAG}

    echo "Criando Stack para a Versão $unoapi_version da unoapi"

    # Recarregar variáveis
    export $(grep -v '^#' .env | xargs)
    export UNOAPI_IMAGE="clairton/unoapi-cloud:$unoapi_version"

    curl -fsSL https://raw.githubusercontent.com/clairton/unoapi-cloud/refs/heads/tutorials/examples/scripts/uno-model.yaml -o uno-model.yaml

    envsubst < uno-model.yaml > docker-unoapi.yaml

    echo "Arquivo docker-unoapi.yaml gerado com sucesso."
    rm uno-model.yaml
    setup
    exit 0
    
}

genCwStack() {
    REPO_OWNER="clairton"
    REPO_NAME="chatwoot"

    # Obtém a última tag
    LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/tags" | jq -r '.[0].name')

    # Verifica se encontrou uma tag
    if [ -z "$LATEST_TAG" ] || [ "$LATEST_TAG" = "null" ]; then
        echo "Nenhuma tag encontrada no repositório remoto."
        exit 1
    fi

    echo "Você quer Gerar uma stack para a versão $LATEST_TAG do chatwoot uno?"
    echo "Para confirmar as versões disponíves, utilize este link: https://hub.docker.com/r/clairton/chatwoot/tags

    Se Deseja a versão $LATEST_TAG: Apenas tecle Enter, 
    Caso Deseje outra Versão: Digite-a para utilizar"
    read cw_version
    cw_version=${cw_version:-$LATEST_TAG}

    echo "Criando Stack para a Versão $cw_version do chatwoot uno"

    # Recarregar variáveis
    export $(grep -v '^#' .env | xargs)
    export CHATWOOT_IMAGE="clairton/chatwoot:$cw_version"
    export SECRET_KEY_CW=$(generate_random_string)

    curl -fsSL https://raw.githubusercontent.com/clairton/unoapi-cloud/refs/heads/tutorials/examples/scripts/chatwoot-model.yaml -o chatwoot-model.yaml

    envsubst < chatwoot-model.yaml > docker-chatwoot.yaml

    echo "Arquivo docker-chatwoot.yaml gerado com sucesso."
    rm chatwoot-model.yaml
    
    setup
    exit 0
}

setup(){
    # SETUP PRINCIPAL
    if [ -f ".env" ]; then
        echo "
        Bem Vindo, Escolha uma opção
        0 - Recriar .env
        1 - Configurar as Opções para o Minio
        2 - Gerar Stack Atualizada da Unoapi
        3 - Gerar Stack Atualizada do Chatwoot Uno
        9 - Sair"
        read resposta

        if [ "$resposta" = "1" ]; then
            echo "Configurar Minio..."
            minio_setup
        fi
        if [ "$resposta" = "2" ]; then
            echo "Configurando Unoapi..."
            genUnoapiStack
        fi
        if [ "$resposta" = "3" ]; then
            echo "Configurado Chatwoot UNO..."
            genCwStack
        fi
        if [ "$resposta" = "9" ]; then
            echo "Saindo..."
            exit 1
        fi
        if [ "$resposta" = "0" ]; then
            echo "Setup Inicial..."
            initialSetup
        else
            echo "Não compreendi sua resposta, Caso queira sair aperte CTRL + C
            "
            setup
        fi
        
    else
        echo "Bem vindo ao AutoConfigurar Stack para a Unoapi e Chatwoot UNO
        Vamos começar?"
        initialSetup
        exit 0
    fi
}

#Valida o parâmetro passado
if [ "$1" = "minio" ]; then
    minio_setup
    exit 0
fi
if [ "$1" = "genUnoStack" ]; then
    genUnoapiStack
    exit 0
fi

if [ "$1" = "genCwStack" ]; then
    genCwStack
    exit 0
fi
if [ "$1" = "" ]; then
    setup
    exit 0
fi