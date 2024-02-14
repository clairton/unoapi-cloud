<div align="center">

[![Whatsapp Group](https://img.shields.io/badge/Group-WhatsApp-%2322BC18)](https://chat.whatsapp.com/CRBaGd850uB1QigKRcguJU)
[![License](https://img.shields.io/badge/license-GPL--3.0-orange)](./LICENSE)
[![Support](https://img.shields.io/badge/Donation-picpay-green)](https://app.picpay.com/user/clairton.rodrigo)
[![Support](https://img.shields.io/badge/Buy%20me-coffe-orange)](https://www.buymeacoffee.com/clairton)

</div>
<h1 align="center">Unoapi Cloud</h1>

An implementation of Baileys(`https://github.com/WhiskeySockets/Baileys`) as
RESTful API service with multi device support with a Whatsapp Cloud API format
`https://developers.facebook.com/docs/whatsapp/cloud-api`.

The media files are saved in file system at folder data with the session or in redis.

## Send a Message

The payload is based on
`https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#messages-object`

To send a message

```sh
curl -i -X POST \
http://localhost:9876/v15.0/5549988290955/messages \
-H 'Content-Type: application/json' \
-d '{ 
  "messaging_product": "whatsapp", 
  "to": "5549988290955", 
  "type": "text", 
  "text": { 
    "body": "hello" 
  } 
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


## Config Options
### Config with Environment Variables

Create a `.env`file and put configuration if you need change default value:

```env
WEBHOOK_URL_ABSOLUTE=the webhook absolute url, not use this if already use WEBHOOK_URL
WEBHOOK_URL=the webhook url, this config attribute put phone number on the end, no use if use WEBHOOK_URL_ABSOLUTE
WEBHOOK_TOKEN=the webhook header token
WEBHOOK_HEADER=the webhook header name
WEBHOOK_SESSION=webhook to send events of type OnStatus and OnQrCode
WEBHOOK_TIMEOUT_MS=webhook request timeout, default 5000 ms
BASE_URL=current base url to download medias
PORT=the http port
IGNORE_GROUP_MESSAGES=false to send group messages received in socket to webhook, default true
IGNORE_BROADCAST_STATUSES=false to send stories in socket to webhook, default true
IGNORE_STATUS_MESSAGE=false to send stories in socket to webhook, default true
IGNORE_BROADCAST_MESSAGES=false to send broadcast messages in socket to webhook, default false
IGNORE_HISTORY_MESSAGES=false to import messages when connect, default is true
IGNORE_OWN_MESSAGES=false to send own messages in socket to webhook, default true
IGNORE_YOURSELF_MESSAGES=true to ignore messages for yourself, default is true, possible loop if was false
COMPOSING_MESSAGE=true enable composing before send message as text length, default false
REJECT_CALLS=message to send when receive a call, default is empty and not reject
REJECT_CALLS_WEBHOOK=message to send webook when receive a call, default is empty and not send, is deprecated, use MESSAGE_CALLS_WEBHOOK
MESSAGE_CALLS_WEBHOOK=message to send webook when receive a call, default is empty and not send
SEND_CONNECTION_STATUS=true to send all connection status to webhook, false to send only important messages, default is true
BASE_STORE=dir where save sessions, medias and stores. Defaul is ./data
IGNORE_DATA_STORE=ignore save/retrieve data(message, contacts, groups...)
AUTO_CONNECT=true, auto connect on start service
AUTO_RESTART_MS=miliseconds to restart connection, default is 0 and not auto restart
THROW_WEBHOOK_ERROR=false send webhook error do self whatsapp, default is false, if true throw exception
NOTIFY_FAILED_MESSAGES=true send message to your self in whatsapp when message failed and enqueued in dead queue
LOG_LEVEL=log level, default warn
UNO_LOG_LEVEL=uno log level. default LOG_LEVEL
SEND_REACTION_AS_REPLY=true to send reactions as replay, default false
SEND_PROFILE_PICTURE=true to send profile picture users and groups, default is true
UNOAPI_RETRY_REQUEST_DELAY_MS=retry delay in miliseconds when decrypt failed, default is 1_000(a second)
```

Bucket env to config assets media compatible with S3, this config can't save in redis:

```env
STORAGE_BUCKET_NAME
STORAGE_ACCESS_KEY_ID
STORAGE_SECRET_ACCESS_KEY
STORAGE_REGION
STORAGE_ENDPOINT
STORAGE_FORCE_PATH_STYLE
```

Config connection to redis to temp save messages and rabbitmq broker, this config can't save in redis too.

```env
AMQP_URL
REDIS_URL
```

### Config with redis

The `.env` can be save one configm, but on redis use different webhook by session number, to do this, save the config json with key format `unoapi-config:XXX`, where XXX is your whatsapp number.

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
      "header": "api_acess_token"
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

### Get a session configs

```sh
curl -i -X GET \
http://localhost:9876/v15.0/1/5549988290955 \
-H 'Content-Type: application/json' \
-H 'Authorization: 1'
```

### List as session configs

```sh
curl -i -X GET \
http://localhost:9876/v15.0/1/phone_numbers \
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
      "header": "api_acess_token"
    }
  ],
  "ignoreDataStore": false
}
```

## Templates

The templates will be customized, saving in `${BASE_STORE}/${PHONE_NUMBER}/templates.json` , or when use redis with key `unoapi-template:${PHONE_NUMBER}`. The json format is:

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

PS: After update JSON, restart de docker container or service


## Examples

### [Docker compose with chatwoot](examples/chatwoot/README.md)

### [Docker compose with unoapi](examples/docker-compose.yml)

### [Docker compose with chatwoot and unoapi together](examples/unochat/README.md)

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

Mail to comercial@unoapi.cloud

## Donate to the project.

#### Pix: 0e42d192-f4d6-4672-810b-41d69eba336e

</br>

#### PicPay

<div align="center">
  <a href="https://app.picpay.com/user/clairton.rodrigo" target="_blank" rel="noopener noreferrer">
    <img src="./picpay.png" style="width: 50% !important;">
  </a>
</div>

</br>

### Buy Me A Coffee

<div align="center">
  <a href="https://www.buymeacoffee.com/clairton" target="_blank" rel="noopener noreferrer">
    <img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" style="width: 50% !important;">
  </a>
</div>

</br>
