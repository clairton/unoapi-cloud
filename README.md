# Unoapi Cloud

An implementation of Baileys(`https://github.com/adiwajshing/Baileys`) as
RESTful API service with multi device support with a Whatsapp Cloud API format
`https://developers.facebook.com/docs/whatsapp/cloud-api`.

The media files are saved in file system at folder data with the session.

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

To turn possible work with group, we add two fields(group_id, group_subject) in
message beside cloud api format if `IGNORE_GROUP_MESSAGES` is `false`.

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
                    "name": "NAME"
                  },
                  "group_id": "123345@g.us",
                  "group_subject": "Awesome Group",
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

## Environment Variables

The ENV Configurations put default value and the format and same name of configs:

```env
WEBHOOK_URL=the webhook url
WEBHOOK_TOKEN=the webhook header token
WEBHOOK_HEADER=the webhook header name
BASE_URL=current base url to download medias
PORT=the http port
IGNORE_GROUP_MESSAGES=false to send group messages received in socket to webhook, default true
IGNORE_BROADCAST_STATUSES=false to send stories in socket to webhook, default true
IGNORE_BROADCAST_MESSAGES=false to send broadcast messages in socket to webhook, default false
IGNORE_HISTORY_MESSAGES=true to import messages when connect, default is false
IGNORE_OWN_MESSAGES=false to send own messages in socket to webhook, default true
IGNORE_YOURSELF_MESSAGES=true to ignore messages for yourself, default is true, possible loop if was false
COMPOSING_MESSAGE=true enable composing before send message as text length, default false
REJECT_CALLS=message to send when receive a call, default is empty and not reject
REJECT_CALLS_WEBHOOK=message to send webook when receive a call, default is empty and not send
SEND_CONNECTION_STATUS=true to send all connection status to webhook, false to send only important messages, default is true
UNOAPI_BASE_STORE=dir where save sessions, medias and stores. Defaul is ./data
```

## Examples

[Integration with Chatwoot](examples/chatwoot/README.md)

## Install as Systemctl

Install nodejs 18 as https://nodejs.org/en/download/package-manager and Git

`mkdir /opt/unoapi && cd /opt/unoapi`

`git clone git@github.com:clairton/unoapi-cloud.git .`

`npm install`

`npm build`

`cp .env.example .env && vi .env`

```env
WEBHOOK_URL=http://chatwoot_addres/webhooks/whatsapp
WEBHOOK_TOKEN=chatwoot token
BASE_URL=https://unoapi_address
UNOAPI_BASE_STORE=/opt/unoapi/data
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

## Need More

Comercial version is available:

- queue and process messages
- persist session in database
- persist contacts, groups and messages in database
- save medias in S3 compatible
- manage templates
- admin dashboard
- vpn connect by number

More informations in http://wa.me/+5549988290955


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
