<div align="center">

[![Whatsapp Group](https://img.shields.io/badge/Group-WhatsApp-%2322BC18)](https://chat.whatsapp.com/FZd0JyPVMLq94FHf59I8HU)
[![License](https://img.shields.io/badge/license-GPL--3.0-orange)](./LICENSE)
[![Support](https://img.shields.io/badge/Donation-picpay-green)](https://app.picpay.com/user/clairton.rodrigo)
[![Support](https://img.shields.io/badge/Buy%20me-coffe-orange)](https://www.buymeacoffee.com/clairton)

</div>
<h1 align="center">Unoapi Cloud</h1>

An implementation of Baileys(`https://github.com/WhiskeySockets/Baileys`) as
RESTful API service with multi device support with a Whatsapp Cloud API format
`https://developers.facebook.com/docs/whatsapp/cloud-api`.

The media files are saved in file system at folder data with the session or in s3 or compatible and redis.


## Read qrcode or config

Go to `http://localhost:9876/session/XXX`, when XXX is your phone number, by example `http://localhost:9876/session/5549988290955`. When disconnect whatsapp number this show the qrcode, read to connect, unoapi response with auth token, save him. When already connect, they show the number config saved in redis, you cloud update, put the auth token and save.

The qrcode is send to configured webhook to, you can read in chatwoot inbox, in created chat with de same number of connection.

### Qrcode with websocket
Use the endpoint `/ws` and listen event `broadcast`, the object with type `qrcode` has a `content` attribute with de base64 url of qrcode
```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:9876/ws', { path: '/ws' });
socket.on('broadcast', data => {
  console.log('broadcast', data);
});
```

## Send a Message

The payload is based on
`https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#messages-object`

To send a message

```sh
curl -i -X POST \
http://localhost:9876/v15.0/554931978550/messages \
-H 'Content-Type: application/json' \
-H 'Authorization: 1' \
-d '{
  "messaging_product": "whatsapp",
  "to": "5549988290955",
  "type": "text",
  "text": {
    "body": "hello"
  } 
}'
```

To send a contact

```sh
curl -i -X POST \
http://localhost:9876/v15.0/5549988290955/messages \
-H 'Content-Type: application/json' \
-H 'Authorization: 1' \
-d '{
  "messaging_product": "whatsapp",
  "to": "5549999621461",
  "type": "contacts",
  "contacts": [
    {
      "name": {
        "formatted_name": "Clairton - Faça um pix nessa chave e contribua com a unoapi"
      },
      "phones": [
        {
          "wa_id": "554988290955",
          "phone": "+5549988290955"
        }
      ]
    }
  ]
}'
```

To send a message to group

```sh
curl -i -X POST \
http://localhost:9876/v15.0/5549988290955/messages \
-H 'Content-Type: application/json' \
-d '{
  "messaging_product": "whatsapp",
  "to": "120363040468224422@g.us",
  "type": "text",
  "text": {
    "body": "hello"
  }
}'
```

To send a message to lid

```sh
curl -i -X POST \
http://localhost:9876/v15.0/5549988290955/messages \
-H 'Content-Type: application/json' \
-H 'Authorization: 1' \
-d '{
  "messaging_product": "whatsapp",
  "to": "206652636680324@lid",
  "type": "text",
  "text": {
    "body": "hello"
  }
}'
```

To mark message as read

```sh
curl -i -X POST \
http://localhost:9876/v15.0/5549988290955/messages \
-H 'Content-Type: application/json' \
-H 'Authorization: 1' \
-d '{
  "messaging_product": "whatsapp",
  "status": "read",
  "message_id": "MESSAGE_ID"
}'
```

## Media

To test media

```sh
curl -i -X GET \
http://localhost:9876/v15.0/5549988290955/3EB005A626251D50D4E4 \
-H 'Content-Type: application/json'
```

This return de url and request this url like

```sh
curl -i -X GET \
http://locahost:9876/download/v13/5549988290955/5549988290955@s.whatsapp.net/48e6bcd09a9111eda528c117789f8b62.png \
-H 'Content-Type: application/json'
```

To send media

`https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#media-messages`

```sh
curl -i -X POST \
http://localhost:9876/v15.0/5549988290955/messages \
-H 'Content-Type: application/json' \
-d '{
  "messaging_product": "whatsapp",
  "to": "5549988290955",
  "type": "image",
  "image": {
    "link" : "https://github.githubassets.com/favicons/favicon-dark.png"
  }
}'
```

## Interactive

To send interactive

```sh

curl -i -X POST \
http://localhost:9876/v15.0/5549988290955/messages \
-H 'Content-Type: application/json' \
-d '{
  "to": "554931978550",
  "type":"interactive",
  "interactive":{
    "type":"list",
    "header":{
      "type":"text",
      "text":"Escolha umas das opções abaixo:"
    },
    "body":{
      "text":"Qual a api melhor custo beneficio?"
    },
    "action":{
      "button":"Clique para ver as opções",
      "sections":[
        {
          "title":"Oficial",
          "rows":[
            {
              "id":"oficial",
              "description":"varias limitações, como iniciar conversas pagando pela janela de 24, se o cliente responder"
            }
          ]
        },
        {
          "title":"Unoapi",
          "rows":[
            {
              "id":"uno",
              "description":"continuar usando o whatsapp no smarphone e sincronizar as mensagem de todos os dispositvos"
            }
          ]
        }
      ]
    }
  }
}'
```

## Send a Speech, send text to unoapi and unoapi convert to audio

Needs put configs  OPENAI_API_KEY, OPENAI_API_SPEECH_VOICE and OPENAI_API_SPEECH_MODEL

```sh
curl -i -X POST \
http://localhost:9876/v15.0/554931978550/messages \
-H 'Content-Type: application/json' \
-H 'Authorization: 1' \
-d '{
  "messaging_product": "whatsapp",
  "to": "5549988290955",
  "type": "speech",
  "speech": {
    "body": "hello"
  } 
}'
```

## Webhook Events

Webhook Events like this
https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples

Message status update on this
https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#message-status-updates

To turn possible work with group, we add three fields(group_id, group_subject and group_picture) in
message beside cloud api format if `IGNORE_GROUP_MESSAGES` is `false`. Unoapi put field` picture` in profile.

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [{
          "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                  "display_phone_number": PHONE_NUMBER,
                  "phone_number_id": PHONE_NUMBER_ID
              },
              "contacts": [{
                  "profile": {
                    "name": "NAME",
                    "picture": "url of image" // extra field of whatsapp cloud api oficial
                  },
                  "group_id": "123345@g.us", // extra field of whatsapp cloud api oficial
                  "group_subject": "Awesome Group", // extra field of whatsapp cloud api oficial
                  "group_picture": "url of image", // extra field of whatsapp cloud api oficial
                  "wa_id": PHONE_NUMBER
                }],
              "messages": [{
                  "from": PHONE_NUMBER,
                  "id": "wamid.ID",
                  "timestamp": TIMESTAMP,
                  "text": {
                    "body": "MESSAGE_BODY"
                  },
                  "type": "text"
                }]
          },
          "field": "messages"
        }]
  }]
}
```

## Error Messages

Messages failed with this
`https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#status--message-failed`

Custom errors sound append this codes
`https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes`
with:

* 1 - unknown erro, verify logs for error details
* 2 - the receipt number not has whatsapp account
* 3 - disconnect number, please read qr code
* 4 - Unknown baileys status
* 5 - Wait a moment, connecting process 
* 6 - max qrcode generate 
* 7 - invalid phone number
* 8 - message not allowed
* 9 - connection lost
* 10 - Invalid token value
* 11 - Http Head test link not return success
* 12 - offline session, connecting....
* 14 - standby session, waiting for time configured
* 15 - realoaded session, send message do connect again



## Verify contacts has whatsapp account
Based on `https://developers.facebook.com/docs/whatsapp/on-premises/reference/contacts`, it works only with standalone mode in `yarn standalone`, for development in `yarn standalone-dev`

```sh
curl -i -X POST \
http://localhost:9876/5549988290955/contacts \
-H 'Content-Type: application/json' \
-H 'Authorization: 1' \
-d '{
  "blocking": "no_wait",
  "contacts": [
  	"16315551000"
  ],
  "force_check": true
}'
```

this return

```json
{
  "contacts": [ 
    {
      "wa_id": "16315551000",
      "input": "16315551000",
      "status": "valid"
    }
  ]
}
```

## Up for development

Copy .env.example to .env an set your config

A `docker-compose.yml` file is available:

```sh
docker compose up
```

Visit `http://localhost:9876/ping` wil be render a "pong!"


## Up for production

A `docker-compose.yml` example for production:

```yml
version: '3'

services:
  app:
    image: clairton/unoapi-cloud:latest
    volumes:
      - ./data:/home/u/app/data
    ports:
      - 9876:9876
    deploy:
      restart_policy:
        condition: on-failure
```

Run `docker compose up`

Visit `http://localhost:9876/ping` wil be render a "pong!"

## Start options

`yarn start` up a single server and save session and media file in filesystem

`yarn cloud` up a single server and save message in redis and message broker rabbitmq

`yarn web` e `yarn worker` up a web and worker with redis and rabbitmq

`yarn standalone` 
  - choose redis when set REDI_URL, if not use file system do save data
  - choose rabbitmq when set AMQP_URL
  - choose s3 when set STORAGE_ envs, if not use file system

`yarn waker` 
  - move all messages in dead queues(listener, incoming, outgoing), to process retry


## Config Options
### Config with Environment Variables

Create a `.env`file and put configuration if you need change default value:

This a general env:

```env
CONSUMER_TIMEOUT_MS=miliseconds in timeout for consume job, default is 30000
AVAILABLE_LOCALES=default is `["en", "pt_BR", "pt"]`
DEFAULT_LOCALE=locale for notifications status, now possibile is en, pt_BR and pt, default is en, to add new, use docker volume for exempla `/app/dist/src/locales/custom.json` and add `custom` in `AVAILABLE_LOCALES`
ONLY_HELLO_TEMPLATE=true sets hello template as the only default template, default false.
MAX_CONNECT_RETRY=3 max call connect with error in MAX_CONNECT_TIME
MAX_CONNECT_TIME=3000 interval of max connect, 5 minutes
CONNECTION_TYPE=connection type use qrcode or pairing_code, default is qrcode
QR_TIMEOUT_MS=60000 timeout for read qrcode, default is 60000
WEBHOOK_SESSION=webhook to send events of type OnStatus and OnQrCode
BASE_URL=current base url to download medias
PORT=the http port
BASE_STORE=dir where save sessions, medias and stores. Defaul is ./data
LOG_LEVEL=log level, default warn
UNO_LOG_LEVEL=uno log level. default LOG_LEVEL
UNOAPI_RETRY_REQUEST_DELAY_MS=retry delay in miliseconds when decrypt failed, default is 1_000(a second)
UNOAPI_DELAY_AFTER_FIRST_MESSAGE_MS=to service had time do create contact and conversation before send next messages, default 0
UNOAPI_DELAY_AFTER_FIRST_MESSAGE_WEBHOOK_MS=to service had time do create contact and conversation in first message after unoapi up, before send next messages, default 0
UNOAPI_DELAY_BETWEEN_MESSAGES_MS=to not duplicate timestamp message. default 0
CLEAN_CONFIG_ON_DISCONNECT=true to clean all saved redis configurations on disconnect number, default is false
CONFIG_SESSION_PHONE_CLIENT=Unoapi Name that will be displayed on smartphone connection
CONFIG_SESSION_PHONE_NAME=Chrome Browser Name = Chrome | Firefox | Edge | Opera | Safari
WHATSAPP_VERSION=Version of whatsapp, default to local Baileys version. Format is `[2, 3000, 1019810866]`
VALIDATE_SESSION_NUMBER=validate the number in session and config is equals, default true
OPENAI_API_KEY=openai api key to transcribe audio
```

Bucket env to config assets media compatible with S3, this config can't save in redis:

```env
STORAGE_BUCKET_NAME
STORAGE_ACCESS_KEY_ID
STORAGE_SECRET_ACCESS_KEY
STORAGE_REGION
STORAGE_ENDPOINT
STORAGE_FORCE_PATH_STYLE
STORAGE_TIMEOUT_MS
```

Config connection to redis to temp save messages and rabbitmq broker, this config can't save in redis too.

```env
AMQP_URL
REDIS_URL
```

This env would be set by session:

```env
WEBHOOK_URL_ABSOLUTE=the webhook absolute url, not use this if already use WEBHOOK_URL
WEBHOOK_URL=the webhook url, this config attribute put phone number on the end, no use if use WEBHOOK_URL_ABSOLUTE
WEBHOOK_TOKEN=the webhook header token
WEBHOOK_HEADER=the webhook header name
WEBHOOK_TIMEOUT_MS=webhook request timeout, default 5000 ms
WEBHOOK_SEND_NEW_MESSAGES=true, send new messages to webhook, caution with this, messages will be duplicated, default is false
WEBHOOK_SEND_GROUP_MESSAGES=true, send group messages to webhook, default is true
WEBHOOK_SEND_OUTGOING_MESSAGES=true, send outgoing messages to webhook, default is true
WEBHOOK_SEND_INCOMING_MESSAGES=true, send incoming messages to webhook, default is true
WEBHOOK_SEND_TRANSCRIBE_AUDIO=false, send trancription audio messages to webhook, needs OPENAI_API_KEY, default is false
WEBHOOK_SEND_UPDATE_MESSAGES=true, send update messages sent, delivered, read
IGNORE_GROUP_MESSAGES=false to send group messages received in socket to webhook, default true
IGNORE_BROADCAST_STATUSES=false to send stories in socket to webhook, default true
IGNORE_NEWSLETTER_MESSAGES=false to ignore newsletter
IGNORE_STATUS_MESSAGE=false to send stories in socket to webhook, default true
READ_ON_RECEIPT=false mark message as read on receipt
IGNORE_BROADCAST_MESSAGES=false to send broadcast messages in socket to webhook, default false
IGNORE_HISTORY_MESSAGES=false to import messages when connect, default is true
IGNORE_OWN_MESSAGES=false to send own messages in socket to webhook, default true
IGNORE_YOURSELF_MESSAGES=true to ignore messages for yourself, default is true, possible loop if was false
COMPOSING_MESSAGE=true enable composing before send message as text length, default false
REJECT_CALLS=message to send when receive a call, default is empty and not reject
REJECT_CALLS_WEBHOOK=message to send webook when receive a call, default is empty and not send, is deprecated, use MESSAGE_CALLS_WEBHOOK
MESSAGE_CALLS_WEBHOOK=message to send webook when receive a call, default is empty and not send
SEND_CONNECTION_STATUS=true to send all connection status to webhook, false to send only important messages, default is true
IGNORE_DATA_STORE=ignore save/retrieve data(message, contacts, groups...)
AUTO_CONNECT=true, auto connect on start service
AUTO_RESTART_MS=miliseconds to restart connection, default is 0 and not auto restart
THROW_WEBHOOK_ERROR=false send webhook error do self whatsapp, default is false, if true throw exception
NOTIFY_FAILED_MESSAGES=true send message to your self in whatsapp when message failed and enqueued in dead queue
SEND_REACTION_AS_REPLY=true to send reactions as replay, default false
SEND_PROFILE_PICTURE=true to send profile picture users and groups, default is true
PROXY_URL=the socks proxy url, default not use
WEBHOOK_FORWARD_PHONE_NUMBER_ID=the phone number id of whatsapp cloud api, default is empty
WEBHOOK_FORWARD_BUSINESS_ACCOUNT_ID=the business account id of whatsapp cloud api, default is empty
WEBHOOK_FORWARD_TOKEN=the token of whatsapp cloud api, default is empty
WEBHOOK_FORWARD_VERSION=the version of whatsapp cloud api, default is v17.0
WEBHOOK_FORWARD_URL=the url of whatsapp cloud api, default is https://graph.facebook.com
WEBHOOK_FORWARD_TIMEOUT_MS=the timeout for request to whatsapp cloud api, default is 360000
```

### Config session with redis

The `.env` can be save one config, but on redis use different webhook by session number, to do this, save the config json with key format `unoapi-config:XXX`, where XXX is your whatsapp number.

```json
{
  "authToken": "xpto",
  "rejectCalls":"Reject Call Text do send do number calling to you",
  "rejectCallsWebhook":"Message send to webhook when receive a call",
  "ignoreGroupMessages": true,
  "ignoreBroadcastStatuses": true,
  "ignoreBroadcastMessages": false,
  "ignoreHistoryMessages": true,
  "ignoreOwnMessages": true,
  "ignoreYourselfMessages": true,
  "sendConnectionStatus": true,
  "composingMessage": false,
  "sessionWebhook": "",
  "autoConnect": false,
  "autoRestartMs": 3600000,
  "retryRequestDelayMs": 1000,
  "throwWebhookError": false,
  "webhooks": [
    {
      "url": "http://localhost:3000/whatsapp/webhook",
      "token": "kslflkhlkwq",
      "header": "api_access_token",
      "sendGroupMessages": false,
      "sendGroupMessages": false,
      "sendNewMessages": false,
    }
  ],
  "ignoreDataStore": false
}
```

PS: After update JSON, restart de docker container or service


### Save config with http

To create a session with http send a post with config in body to `http://localhost:9876/v15.0/:phone/register`, change :phone by your phone session number and put content of env UNOAPI_AUTH_TOKEN in Authorization header:

```sh
curl -i -X POST \
http://localhost:9876/v17.0/5549988290955/register \
-H 'Content-Type: application/json' \
-H 'Authorization: 1' \
-d '{ 
  "ignoreOwnMessages": false
}'
```

### Delete config and session with http

To remover a session with http send a post to `http://localhost:9876/v15.0/:phone/deregister`, change :phone by your phone session number and put content of env UNOAPI_AUTH_TOKEN in Authorization header:

```sh
curl -i -X POST \
http://localhost:9876/v17.0/5549988290955/deregister \
-H 'Content-Type: application/json' \
-H 'Authorization: 1' 
```

### Get a session config

```sh
curl -i -X GET \
http://localhost:9876/sessions/5549988290955 \
-H 'Content-Type: application/json' \
-H 'Authorization: 1'
```

### List the sessions configs

```sh
curl -i -X GET \
http://localhost:9876/sessions \
-H 'Content-Type: application/json' \
-H 'Authorization: 1'
```

```json
{
  "authToken": "xpto",
  "rejectCalls":"Reject Call Text do send do number calling to you",
  "rejectCallsWebhook":"Message send to webhook when receive a call",
  "ignoreGroupMessages": true,
  "ignoreBroadcastStatuses": true,
  "ignoreBroadcastMessages": false,
  "ignoreHistoryMessages": true,
  "ignoreOwnMessages": true,
  "ignoreYourselfMessages": true,
  "sendConnectionStatus": true,
  "composingMessage": false,
  "sessionWebhook": "",
  "autoConnect": false,
  "autoRestartMs": 3600000,
  "retryRequestDelayMs": 1000,
  "throwWebhookError": false,
  "webhooks": [
    {
      "url": "http://localhost:3000/whatsapp/webhook",
      "token": "kslflkhlkwq",
      "header": "api_access_token"
    }
  ],
  "ignoreDataStore": false
}
```

## Templates

UnoAPI's default definition has 4 templates: hello, unoapi-bulk-report, unoapi-webhook and unoapi-config. UnoAPI can be configured to only present the hello template as default, check the ONLY_HELLO_TEMPLATE variable to obtain this behavior

The templates for each Session (PHONE_NUMBER) can be be customized, saving in `${BASE_STORE}/${PHONE_NUMBER}/templates.json` , or when use redis with key `unoapi-template:${PHONE_NUMBER}`. The json format is:

```json
[
  {
    "id": 1,
    "name": "hello",
    "status": "APPROVED",
    "category": "UTILITY",
    "components": [
      {
        "text": "{{hello}}",
        "type": "BODY",
        "parameters": [
          {
            "type": "text",
            "text": "hello",
          },
        ],
      },
    ],
  }
]
```

### Save templates with http

To edit (by id) or add a template with http send a post with the template in body to `http://localhost:9876/v15.0/:phone/templates`, change :phone by your phone session number and put content of env UNOAPI_AUTH_TOKEN in Authorization header:

```sh
curl -i -X POST \
http://localhost:9876/v17.0/5549988290955/templates \
-H 'Content-Type: application/json' \
-H 'Authorization: 1' \
-d '{"id":1,"name":"hello","status":"APPROVED","category":"UTILITY","components":[{"text":"{{hello}}","type":"BODY","parameters":[{"type":"text","text":"hello"}]}]}'
```

PS: After update JSON, restart de docker container or service

## Examples

### [Docker compose with chatwoot](examples/chatwoot/README.md)

### [Docker compose with chatwoot and unoapi inbox](examples/chatwoot-uno/README.md)

### [Docker compose with unoapi](examples/docker-compose.yml)

### [Docker compose with chatwoot and unoapi together](examples/unochat/README.md)

### [Typebot](examples/typebot/README.md)

## Install as Systemctl

Install nodejs 21 as https://nodejs.org/en/download/package-manager and Git

`mkdir /opt/unoapi && cd /opt/unoapi`

`git clone git@github.com:clairton/unoapi-cloud.git .`

`npm install`

`npm build`

`cp .env.example .env && vi .env`

```env
WEBHOOK_URL=http://chatwoot_addres/webhooks/whatsapp
WEBHOOK_TOKEN=chatwoot token
BASE_URL=https://unoapi_address
BASE_STORE=/opt/unoapi/data
WEBHOOK_HEADER=api_access_token
```

And other .env you desire

`chown -R $(whoami) ./data/sessions && chown -R $(whoami) ./data/stores && chown -R $(whoami) ./data/medias`

`vi /etc/systemd/system/unoapi.service` or `systemctl edit --force --full unoapi.service`

And put

```
[Unit]
Description=Unoapi
ConditionPathExists=/opt/unoapi/data
After=network.target
  
[Service]
ExecStart=/usr/bin/node dist/index.js
WorkingDirectory=/opt/unoapi
CPUAccounting=yes
MemoryAccounting=yes
Type=simple
Restart=on-failure
TimeoutStopSec=5
RestartSec=5

[Install]  
WantedBy=multi-user.target
```
Run

`systemctl daemon-reload && systemctl enable unoapi.service && systemctl start unoapi.service`

To show logs `journalctl -u unoapi.service -f`

## Postman collection

[![Postman Collection](https://img.shields.io/badge/Postman-Collection-orange)](https://www.postman.com/clairtonrodrigo/workspace/unoapi/collection/2340422-8951a202-9a18-42ea-b6be-42f57b4d768d?tab=variables)

## Caution with whatsapp web connection
More then 14 days without open app in smartphone, the connection with whatsapp web is invalidated and need to read a new qrcode.

## Future providers
### Current lib is baileys, to other libraries implement subscribe:
- incoming and convert whatsapp cloud api format to lib format
- disconnect to remove conection
- reload do close socket and reopen
### to send messages:
- write in rabbitmq queue outgoing in format

https://github.com/NaikAayush/whatsapp-cloud-api
https://github.com/green-api/whatsapp-api-client-golang

## Legal

- This code is in no way affiliated, authorized, maintained, sponsored or
  endorsed by WA (WhatsApp) or any of its affiliates or subsidiaries.
- The official WhatsApp website can be found at https://whatsapp.com. "WhatsApp"
  as well as related names, marks, emblems and images are registered trademarks
  of their respective owners.
- This is an independent and unofficial software Use at your own risk.
- Do not spam people with this.

## Note

I can't guarantee or can be held responsible if you get blocked or banned by
using this software. WhatsApp does not allow bots using unofficial methods on
their platform, so this shouldn't be considered totally safe.

Released under the GPLv3 License.

## WhatsApp Group

https://chat.whatsapp.com/FZd0JyPVMLq94FHf59I8HU

## Need More

Mail to sales@unoapi.cloud

## Donate to the project.

#### Become a sponsor: https://github.com/sponsors/clairton

#### Pix: 0e42d192-f4d6-4672-810b-41d69eba336e

## Roadmap
- Gif message as video: https://github.com/WhiskeySockets/Baileys#gif-message
- Disappearing messages: https://github.com/WhiskeySockets/Baileys#disappearing-messages
- Send Stories: https://github.com/WhiskeySockets/Baileys#broadcast-lists--stories
- Filter by specific date on sync history: https://github.com/WhiskeySockets/Baileys?tab=readme-ov-file#receive-full-history
- Add /health endpoint with test connection with redis, s3 and rabbitmq
- https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/reference/smb_message_echoes?locale=pt_BR format message sending by app\
- https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/reference/history?locale=pt_BR format for sync history 

## Ready
- Connect with pairing code: https://github.com/WhiskeySockets/Baileys#starting-socket-with-pairing-code
- Counting connection retry attempts even when restarting to prevent looping messages
- Message delete endpoint
- Send reply message with please to send again, when any error and message enqueue in .dead