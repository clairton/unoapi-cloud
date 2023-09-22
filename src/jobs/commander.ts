import { UNOAPI_JOB_BULK_PARSER } from '../defaults'
import { amqpEnqueue } from '../amqp'
import { v1 as uuid } from 'uuid'
import { Outgoing } from '../services/outgoing'
import { phoneNumberToJid } from '../services/transformer'
import { Template } from '../services/template'
import { getConfig } from '../services/config'
import { parseDocument } from 'yaml'
import { configs } from '../services/config_redis'
import { setConfig } from '../services/redis'
import { UNOAPI_JOB_BULK_REPORT } from '../defaults'
import logger from '../services/logger'

export class CommanderJob {
  private outgoing: Outgoing
  private getConfig: getConfig
  private queueBulkParser: string

  constructor(outgoing: Outgoing, getConfig: getConfig, queueBulkParser: string = UNOAPI_JOB_BULK_PARSER) {
    this.outgoing = outgoing
    this.getConfig = getConfig
    this.queueBulkParser = queueBulkParser
  }

  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { phone, payload } = data as any
    logger.debug(
      `Commander type: ${payload.type} caption: ${payload?.document?.caption} link: ${payload?.document?.link} template: ${payload?.template?.name}`,
    )
    if (payload.type === 'document' && payload?.document?.caption?.toLowerCase() == 'campanha') {
      logger.debug(`Commander processing`)
      const id = uuid()
      await amqpEnqueue(this.queueBulkParser, {
        phone,
        payload: {
          id,
          phone,
          template: 'sisodonto',
          url: payload?.document?.link,
        },
      })
      const message = {
        key: {
          fromMe: true,
          remoteJid: phoneNumberToJid(phone),
          id: uuid(),
        },
        message: {
          conversation: `The bulk ${id} is created and wil be parsed!`,
        },
        messageTimestamp: new Date().getTime(),
      }
      this.outgoing.sendOne(phone, message)
    } else if (payload?.to && phone === payload?.to && payload?.template && payload?.template.name == 'unoapi-webhook') {
      logger.debug('Parsing webhook template...', phone)
      /**
       * webhook config expected
       * url:
       * token:
       * header:
       */
      try {
        const service = new Template(this.getConfig)
        const { text } = await service.bind(phone, payload?.template.name, payload?.template.components)
        logger.debug('Template webhook content', text)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = parseDocument(text)
        if (doc.errors.length) {
          logger.error('Error os parse yml', doc.errors)
        }
        const webhook = doc.toJS()
        logger.debug('Template webhook', phone, JSON.stringify(webhook))
        const configRedis = (await this.getConfig(phone)) || {}
        const config = { ...configRedis }
        config.webhooks = [webhook]
        logger.debug('Change config %s to %s', JSON.stringify(configRedis), JSON.stringify(config))
        configs.delete(phone)
        await setConfig(phone, config)
      } catch (error) {
        logger.error('Erro on parse to yml', error)
      }
    } else if (payload?.to && phone === payload?.to && payload?.template && payload?.template.name == 'unoapi-bulk-report') {
      logger.debug('Parsing bulk report template...', phone)
      /**
       * webhook config expected
       * url:
       * token:
       * header:
       */
      try {
        const service = new Template(this.getConfig)
        const { text } = await service.bind(phone, payload?.template.name, payload?.template.components)
        logger.debug('Template bulk report content', text)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = parseDocument(text)
        if (doc.errors.length) {
          logger.error('Error os parse yml', doc.errors)
        }
        const { bulk } = doc.toJS()
        await amqpEnqueue(UNOAPI_JOB_BULK_REPORT, { phone, payload: { phone, id: bulk, unverified: true } })
      } catch (error) {
        logger.error('Erro on parse to yml', error)
      }
    } else if (payload?.to && phone === payload?.to && payload?.template && payload?.template.name == 'unoapi-config') {
      logger.debug('Parsing config template...', phone)
      try {
        const service = new Template(this.getConfig)
        const { text } = await service.bind(phone, payload?.template.name, payload?.template.components)
        const doc = parseDocument(text)
        if (doc.errors.length) {
          logger.error('Error os parse yml', doc.errors)
        }
        const configParsed = doc.toJS() || {}
        logger.debug('Config template parsed', phone, JSON.stringify(configParsed))
        const keys = Object.keys(configParsed)
        const configToUpdate = keys.reduce((acc, key) => {
          if (configParsed[key]) {
            acc[key] = configParsed[key]
          }
          return acc
        }, {})
        logger.debug('Config template to update', phone, JSON.stringify(configToUpdate))
        const configRedis = (await this.getConfig(phone)) || {}
        const config = { ...configRedis, ...configToUpdate }
        logger.debug('Change config %s to %s', JSON.stringify(configRedis), JSON.stringify(config))
        configs.delete(phone)
        await setConfig(phone, config)
      } catch (error) {
        logger.error('Erro on parse to yml', error)
      }
    } else {
      logger.debug(`Commander ignore`)
    }
  }
}
