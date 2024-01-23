# Unoapi e Chatwoot em poucos comandos

OBS: 
  - vou utilizar meu dominio lvh.me e você deve trocar pelo seu.
  - use uma maquina ou vps limpa, pois temos uma serviço do traefik que vai utilizar a porta 80 e 443, se ja tiver um ngnix ou algum outro serviço rodando utilizando essa porta vai conflitar e não vai dar certo
  - essa versão do chatwoot que esta sendo usada aqui tem algumas customizações que ainda não foram aceitas pelo time do chatwoot:
    - coloca o nome do agente na mensagem
    - marca as mensagem no whatsapp como lido quando o agente visualiza a conversa
    - funciona as conversas em grupo
    - trata a mensagem enviads por outras conexões, inclusive o aplicativo
    - desabilita a janela de 24 horas do whatsapp cloud oficial
    - sincroniza as imagens de perfil dos grupos e usuarios
    - possibilidade de editar o endereço da caixa de entrada do whatsapp, assim pode usar a oficial e a unoapi na mesma instalação

1 - Para iniciar você precisa apontar os DNS para o ip da sua VPS, isso deve ser feito no registro.br, cloudflare, ou no lugar onde você tem configurado o seu dominio:
  - chatwoot.lvh.me
  - unoapi.lvh.me
  - minio.lvh.me

2 - A sua maquina ou vps precisa ter o docker e o docker compose instalados, pode mais mais detalhes aqui `https://docs.docker.com/engine/install/`

3 - Em sua maquina ou vps e faça download do docker-compose.yml e .env em uma pasta unochat:
  - `mkdir unochat`
  - `cd unochat`
  - `wget -O .env https://raw.githubusercontent.com/clairton/unoapi-cloud/main/examples/unochat/.env`
  - `wget -O docker-compose.yml https://raw.githubusercontent.com/clairton/unoapi-cloud/main/examples/unochat/docker-compose.yml`

4 - Altere os dados, nesse caso senhas e dominios no .env conforme os seus dados, são essas variaveis que necessitam ser editadas:
  - CHATWOOT_DOMAIN -> endereço do chatwoot
  - UNOAPI_DOMAIN -> endereço do unoapi
  - MINIO_DOMAIN -> endereço do minio
  - LETSECRYPT_EMAIL -> email para gerar o certificado
  - UNOAPI_AUTH_TOKEN -> token para autenticar na unoapi
  - STORAGE_SECRET_ACCESS_KEY -> token para autenticar no minio
  OBS: para editar esses dados pode usar o editor de texto como o nano, vi ou vim ou até mesmo por FTP com o programa que se sentir mais a vontade

5 - Agora vamos subir os serviços:
  - `docker compose up -d`

6 - Agora no browser va até o endereço que você apontou no registro de DNS, por exemplo `http://chatwoot.lvh.me`, e siga o onbording para a configuração do seu chatwoot, copie o token de autenticação que vamos atualizar para o uso na unoapi:

![image](prints/copy_token.png)

7 - Novamente em dua maquina ou VPS, edite o arquivo .env e cole esse valor na env WEBHOOK_TOKEN, vai ficar mais ou menos assim:
  - `WEBHOOK_TOKEN=conteudo_do_token_copiado_do_chatwoot`

8 - Após isso precisa reiniciar o serviço do unoapi para ele ler esse novo valor da env:
  - `docker compose restart unoapi`

9 - Novamente no chatwoot em seu navegador, crie um caixa de entrada, com o tipo Whatsapp, em "ID do número de telefone" e "ID da Conta de Negócios" use o mesmo numero de telefone sem o "+", outra questão importante para o Brasil, use o numero se for celular, com 9 digito. Em "Whatsapp Cloud API URL" habilite a edição e deixe com o conteudo dominio colocado na env `UNOAPI_DOMAIN`e o campo "Chave da API" com o conteudo da env `UNOAPI_AUTH_TOKEN`

![image](prints/create_inbox.png)

10 - Agora crie um contato com o mesmo número da sua caixa de entrada.

![image](prints/create_contact.png)

11 - Envia uma mensagem com qualquer texto, o unoapi vai perceber que o numero ainda não está conectado e vai enviar o qrcode para você ler.

![image](prints/read_qrcode.png)

12 - Quando a leitura do qrcode for efetuada com sucesso, o unoapi vai desolver um novo token de autenticação especifico para esse numero/sessão recem conectado. Copie ele.

![image](prints/copy_uno_token.png)

13 - Cole esse token na caixa de entrada, para garantir que haja a comunicação entre o chatwoot e unoapi

![image](prints/update_inbox.png)

14 - Honre a Deus, seja Feliz, beba água, contribua com melhorias para o opensource, não faça spam e se quiser mandar uma doação, os dados estão no readme principal.
