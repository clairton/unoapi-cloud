# Baileys Cloud API [WIP]

An implementation of Baileys(`https://github.com/adiwajshing/Baileys`) as RESTful API service with multi device support with a Whatsapp Cloud API format `https://developers.facebook.com/docs/whatsapp/cloud-api`.

The media files are saved in file system at folder data with the session.

Up service for development `docker compose up`

## Send a Message

The payload is based on `https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#messages-object`

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
http://localhost:9876/v15.0/989bdb10-a56e-11ed-bb2e-ed02e17cf778 \
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

Webhook Events like this https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples

Message status update on this https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#message-status-updates

To turn possible work with group, we add two fields(group_id, group_subject) in message beside cloud api format.
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

Messages failed with this `https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#status--message-failed`

Custom errors sound append this codes `https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes` with:

* 100 - o numero não tem whatsapp
* 10 - invalid token
* 0 - message invalida para conexão
* 2 - whatsapp web desconectado, precisa ler o qrcode para autorizar
* 1 - quantidade de geração de qrcode ultrapassou o limite

## Environment Variables

The ENV Configurations put default value and the format and same name of configs with prefix UNOAPI:

```env
CONNECTION_TIMEOUT: the timeout baileys whatsapp connection
```

## Recomended Resources

30 mb of memory by whatsapp number connection

## Note

I can't guarantee or can be held responsible if you get blocked or banned by using this software. WhatsApp does not allow bots using unofficial methods on their platform, so this shouldn't be considered totally safe.

## Legal

-   This code is in no way affiliated, authorized, maintained, sponsored or endorsed by WA (WhatsApp) or any of its affiliates or subsidiaries.
-   The official WhatsApp website can be found at https://whatsapp.com. "WhatsApp" as well as related names, marks, emblems and images are registered trademarks of their respective owners.
-   This is an independent and unofficial software Use at your own risk.
-   Do not spam people with this.

## Need More

Comercial version is available: 
  * read/recepeit
  * queue and process messages
  * persist session in database
  * S3 upload medias
  * admin dashboard
  * vpn connect by number
  
More informations in http://wa.me/+5549988290955