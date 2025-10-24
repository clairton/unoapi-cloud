import { Request, Response } from 'express'
import { getConfig } from '../services/config'
import { SessionStore } from '../services/session_store'
import logger from '../services/logger'
import { getAuthHeaderToken } from '../services/security'
import { UNOAPI_AUTH_TOKEN , WABA_ID , BUSINESS_ID } from '../defaults'
import { setConfig } from '../services/redis'
import { Reload } from '../services/reload'

export class PhoneNumberController {
  private getConfig: getConfig
  private sessionStore: SessionStore
  private reload: Reload

  constructor(getConfig: getConfig, sessionStore: SessionStore, reload: Reload) {
    this.getConfig = getConfig
    this.sessionStore = sessionStore
    this.reload = reload
  }

  public async get(req: Request, res: Response) {
    logger.debug('phone number get method %s', req.method)
    logger.debug('phone number get headers %s', JSON.stringify(req.headers))
    logger.debug('phone number get params %s', JSON.stringify(req.params))
    logger.debug('phone number get body %s', JSON.stringify(req.body))
    logger.debug('phone number get query', JSON.stringify(req.query))
    try {
      const { phone } = req.params
      const config = await this.getConfig(phone)
      const store = await config.getStore(phone, config)
      logger.debug('Session store retrieved!')
      const { sessionStore } = store
      const templates = await store.dataStore.loadTemplates()
      logger.debug('Templates retrieved!')
      return res.status(200).json({
        display_phone_number: phone.replace('+', ''),
        status: await sessionStore.getStatus(phone),
        message_templates: { data: templates },
        ...config,
      })
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }

  public async list(req: Request, res: Response) {
    logger.debug('phone number list method %s', req.method)
    logger.debug('phone number list headers %s', JSON.stringify(req.headers))
    logger.debug('phone number list params %s', JSON.stringify(req.params))
    logger.debug('phone number list body %s', JSON.stringify(req.body))
    logger.debug('phone number list query', JSON.stringify(req.query))
    const token = getAuthHeaderToken(req)
    try {
      const phones = await this.sessionStore.getPhones()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configs: any[] = []
      for (let i = 0, j = phones.length; i < j; i++) {
        const phone = phones[i]
        const config = await this.getConfig(phone)
        const store = await config.getStore(phone, config)
        const { sessionStore } = store
        const status = config.provider == 'forwarder' ? 'forwarder' : await sessionStore.getStatus(phone)
        if ([UNOAPI_AUTH_TOKEN, config.authToken].includes(token)) {
          configs.push({ ...config, display_phone_number: phone.replace('+', ''), status })
        }
      }
      logger.debug('Configs retrieved!')
      return res.status(200).json({ data: configs })
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }

  public async accounts(req: Request, res: Response) {
    logger.debug('accounts method %s', req.method)
    logger.debug('headers %s', JSON.stringify(req.headers))
    logger.debug('params %s', JSON.stringify(req.params))
    logger.debug('query %s', JSON.stringify(req.query))
    logger.debug('PATH %s', JSON.stringify(req.path))
    try {
      const token = getAuthHeaderToken(req)
      const { fields } = req.query

      if (fields && (fields as string).split(',').includes('owned_whatsapp_business_accounts') || req.path.endsWith('/owned_whatsapp_business_accounts')) {
        logger.debug('Processing owned_whatsapp_business_accounts request')
        const phones = await this.sessionStore.getPhones()
        const accounts: any[] = []

        for (let i = 0; i < phones.length; i++) {
          const number = phones[i]
          const config = await this.getConfig(number)

          if (token === UNOAPI_AUTH_TOKEN || token === config.authToken) {
            accounts.push({ id: WABA_ID }) // id = número
            break
          }
        }

        // Retorna no formato Graph API
        return res.status(200).json({
          id: WABA_ID,
          name: "UNOAPI WABA ACCOUNT",
          timezone_id: "America/Sao_Paulo",
          owned_whatsapp_business_accounts: {
            data: accounts,
          },
        })
        
      }
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }


  public async debugToken(req: Request, res: Response) {
    logger.debug('debug_token method %s', req.method)
    logger.debug('headers %s', JSON.stringify(req.headers))
    logger.debug('params %s', JSON.stringify(req.params))
    logger.debug('query %s', JSON.stringify(req.query))

    const inputToken = req.query.input_token as string
    const accessToken = req.query.access_token as string

    try {
      if (!inputToken || !accessToken) {
        return res.status(400).json({ error: 'Missing input_token or access_token' })
      }

      const phones = await this.sessionStore.getPhones()
      let isValid = false
      let matchedConfig: any = null
      let appId: any
      let label: any

      for (let i = 0; i < phones.length; i++) {
        const phone = phones[i]
        const config = await this.getConfig(phone)

        if (inputToken === config.authToken && accessToken === config.authToken) {
          isValid = true
          matchedConfig = config
          label = config.label
          appId = phone
          break
        }
      }

      return res.status(200).json({
        data: {
          app_id: appId.replace('+', '') || "APP_ID_NOT_FOUND",
          type: "USER",
          application: "UNOAPI",
          data_access_expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // +1 ano
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 425, // +1 ano e 1 mês
          is_valid: isValid,
          issued_at: Math.floor(Date.now() / 1000) - (60 * 60 * 24), // há 1 dia
          scopes: [
            "whatsapp_business_management",
            "whatsapp_business_messaging",
            "business_management",
            "whatsapp_business_manage_events"
          ],
          user_id: matchedConfig ? appId.replace('+', '') || "single_user" : "global_user"
        }
      })
    } catch (e: any) {
      logger.error('Error in debug_token: ' + e.message)
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }
  
  public async waba(req: Request, res: Response) {
    logger.debug('headers %s', JSON.stringify(req.headers))
    logger.debug('params %s', JSON.stringify(req.params))
    logger.debug('query %s', JSON.stringify(req.query))
    logger.debug('path %s', req.path)

    try {
      const token = getAuthHeaderToken(req)
      const { waba_id } = req.params
      const phones = await this.sessionStore.getPhones()
      const foundConfigs: any[] = []

      for (const number of phones) {
        const config = await this.getConfig(number)
        if (token === config.authToken) {
          foundConfigs.push({ ...config, number })
        }
      }

      if (foundConfigs.length === 0) {
        return res.status(403).json({ error: 'Invalid or unauthorized token' })
      }

      let response: any = {}

      // 🔹 Caso: rota de listagem de números
      if (req.path.endsWith('/phone_numbers')) {
        logger.debug('Processing PHONE_NUMBERS request')

        const numbersData = foundConfigs.map(cfg => {
          const webhookUrl =
            Array.isArray(cfg.webhooks) && cfg.webhooks.length > 0
              ? cfg.webhooks[0].urlAbsolute
              : null

          return {
            id: cfg.number.replace('+', ''),
            display_phone_number: cfg.number.replace('+', ''),
            verified_name: String(cfg.label || 'WhatsApp Account').toUpperCase(),
            quality_rating: 'GREEN',
            code_verification_status: 'VERIFIED',
            new_name_status: 'APPROVED',
            is_pin_enabled: false,
            throughput: {level:'TIER_1'},
            platform_type: 'BUSINESS',
            status: 'CONNECTED',
            webhook_configuration: {application: webhookUrl ? webhookUrl: ''},
          }
        })

        response = { data: numbersData }
      }

      // 🔹 Caso: informações gerais do WABA
      else {
        logger.debug('Processing generic WABA info request')
        const firstCfg = foundConfigs[0]

        response = {
          id: waba_id,
          name: String(firstCfg.label || 'UNOAPI WABA ACCOUNT').toUpperCase(),
          currency: 'BRL',
          timezone_id: 42,
          message_template_namespace: firstCfg.label.slice(0, 10),
          primary_business_location: { country: 'BR' },
          creation_time: new Date().toISOString(),
          tier: 'TIER_1',
        }
      }

      return res.status(200).json(response)
    } catch (e: any) {
      logger.error('Erro em WABA:', e)
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }


  public async getsubs(req: Request, res: Response) {
    logger.debug('get subscriptions -> headers %s', JSON.stringify(req.headers))
    logger.debug('get subscriptions -> params %s', JSON.stringify(req.params))
    logger.debug('get subscriptions -> query %s', JSON.stringify(req.query))
    logger.debug('get subscriptions -> path %s', req.path)

    try {
      const { phone } = req.params
      const accessToken = req.query.access_token as string

      // Verificação básica
      if (!accessToken || !accessToken.includes('|')) {
        return res.status(400).json({ error: 'Access token inválido ou ausente' })
      }

      const [appId, userToken] = accessToken.split('|')

      if (appId !== phone) {
        return res.status(403).json({ error: 'appId não corresponde ao número de telefone' })
      }

      // Obter a configuração do número
      const config = await this.getConfig(phone)
      if (!config) {
        return res.status(404).json({ error: 'Número não encontrado' })
      }

      // Validar token
      if (userToken !== config.authToken && userToken !== UNOAPI_AUTH_TOKEN) {
        return res.status(403).json({ error: 'Token inválido para este número' })
      }

      // Procurar webhook da Meta
      const webhooks = config.webhooks || []
      const metaWebhook = webhooks.find((w: any) => w.id === 'metaId')

      // Se não houver webhook "metaId", retorna vazio
      if (!metaWebhook) {
        logger.debug(`Nenhum webhook metaId encontrado para ${phone}`)
        return res.status(200).json({ data: [] })
      }

      // Montar resposta no formato esperado da Graph API
      const response = {
        data: [
          {
            object: 'whatsapp_business_account',
            id: metaWebhook.id,
            callback_url: metaWebhook.urlAbsolute,
            fields: [{name:"UNOAPI",version:"20.0"}],
            active: true,
            verification_token: metaWebhook.token,
            webhook_format: 'json'
          }
        ]
      }

      return res.status(200).json(response)

    } catch (e: any) {
      logger.error('Erro em getsubs:', e)
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }
  
  public async addsubs(req: Request, res: Response) {
    logger.info('POST SUBS -> headers %s', JSON.stringify(req.headers))
    logger.info('POST SUBS -> params %s', JSON.stringify(req.params))
    logger.info('POST SUBS -> body %s', JSON.stringify(req.body))
    logger.info('POST SUBS -> query %s', JSON.stringify(req.query))
    logger.info('POST SUBS -> path %s', req.path)

    try {
      const { phone } = req.params
      const config = await this.getConfig(phone)
      const accessToken = req.query.access_token as string
      const body = req.body || {}
      const [appId, userToken] = accessToken.split('|')

      // --- Validações ---
      if (!config) {
        return res.status(404).json({ error: 'Número não encontrado' })
      }
      if (!accessToken || !accessToken.includes('|')) {
        return res.status(400).json({ error: 'Access token inválido ou ausente' })
      }
      if (appId !== phone || userToken !== config.authToken) {
        return res.status(403).json({ error: 'appId ou Token não corresponde' })
      }

      const {
        object,
        fields,
        callback_url,
        verify_token
      } = body

      if (!callback_url || !verify_token) {
        return res.status(400).json({ error: 'callback_url e verify_token são obrigatórios' })
      }

      // --- 🔄 criar ou atualizar webhook "metaId" ---
      const newWebhook = {
        sendNewMessages: true,
        id: 'metaId',
        urlAbsolute: callback_url,
        token: verify_token,
        header: 'Authorization',
        sendGroupMessages: false,
        sendNewsletterMessages: false,
        sendOutgoingMessages: true,
        sendUpdateMessages: true,
        sendIncomingMessages: true,
        sendTranscribeAudio: false,
        url:"http://localhost:9876/webhooks/fake",
        addToBlackListOnOutgoingMessageWithTtl:0,
        timeoutMs:360000
      }

      const webhooks = config.webhooks || []
      const index = webhooks.findIndex((w: any) => w.id === 'metaId')

      if (index >= 0) {
        webhooks[index] = { ...webhooks[index], ...newWebhook }
        logger.info(`Webhook metaId atualizado para ${phone}`)

      } else {
        webhooks.push(newWebhook)
        logger.info(`Webhook metaId adicionado para ${phone}`)
      }
      // Merge config
      const mergedConfig = {
        ...config,
        webhooks,
      }      
      logger.info('POST SUBS -> MERGED CONFIG ----------------  %s', JSON.stringify(mergedConfig))

      // save config updated
      await setConfig(phone, mergedConfig)
      this.reload.run(phone)
      
      return res.status(200).json({
        success: true,
        data: {
          object: object || 'whatsapp_business_account',
          callback_url,
          fields: fields || 'messages',
          active: true,
          verify_token,
        }
      })

    } catch (e: any) {
      logger.error('Erro em addsubs:', e)
      return res.status(500).json({ status: 'error', message: e.message })
    }
  }

}