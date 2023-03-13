# Baileys Cloud API with Chatwoot

Get the chatwoot source or image and change the env `WHATSAPP_CLOUD_BASE_URL=http://localhost:9876` and up.

Copy the token ![image](prints/copy_token.png)

Clone de Baileys Cloud API project and run `yarn`.

Now up him with and `WEBHOOK_URL=http://localhost:3000/webhooks/whatsapp WEBHOOK_TOKEN=the_chatwoot_token WEBHOOK_HEADER=api_access_token yarn dev`(for production `yarn build` and after `yarn start`). Change the_chatwoot_token for your token,

Create a inbox in Chatwoot with Whatsapp Cloud API type, in "Phone number ID" and "Business Account ID" put the number without "+".

![image](prints/create_channel.png)

Create a contact with de same number, and send a message.

![image](prints/create_contact.png)

In a contact with the same number read the qrcode and be happy! =)

![image](prints/read_qrcode.png)