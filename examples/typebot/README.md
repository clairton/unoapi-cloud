# Unoapi Cloud with Typebot

Get the typebot source or image and change the env `WHATSAPP_CLOUD_API_URL` to you Unoapi url (ex: `http://localhost:9876` 

In your typebot flow go to Share > Whatsapp  ![image](prints/whatsapp_menu.png)

Click on Add WA Phone Number ![image](prints/add_phone.png)

Click in continue

In the System User Token, put the token from the Unoapi env (authToken  ) ![image](prints/put_token.png)

In the Phone number ID, put the phone number without the + sign, ex 55999999999  ) ![image](prints/phone_number.png)

Put the callback url and token in the unoapi redis or .env config, exemple below.

![image](prints/callback.png)

![image](prints/config_uno.png)

```env
  "webhooks":[
    {
      "urlAbsolute":"YOUR TYPEBOT URL"
      "token":"Bearer YOR TOKEN",
      "header":"Authorization"
    }
  ],
````

And click in submit on typebot ![image](prints/callback.png)

After, enable the integration on typebot and click in Publish. ![image](prints/publish.png)



# Lists with typebot

To use lists, you need to use the text bubble followed by button input. ![image](prints/lists.png)

![image](prints/exemple_list_typebot.png)