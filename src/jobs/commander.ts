import { UNOAPI_JOB_BULK_PARSER, UNOAPI_JOB_RELOAD } from '../defaults'
import { amqpEnqueue } from '../amqp'
import { v1 as uuid } from 'uuid'
import { Outgoing } from '../services/outgoing'
import { Template } from '../services/template'
import { getConfig } from '../services/config'
import { parseDocument, YAMLError } from 'yaml'
import { setConfig } from '../services/redis'
import { UNOAPI_JOB_BULK_REPORT } from '../defaults'
import logger from '../services/logger'

export class YamlParseError extends Error {
  readonly errors: YAMLError[]
  constructor(errors: YAMLError[]) {
    super('')
    this.errors = errors
  }
}

export class CommanderJob {
  private outgoing: Outgoing
  private getConfig: getConfig
  private queueBulkParser: string
  private queueReload: string

  constructor(outgoing: Outgoing, getConfig: getConfig, queueBulkParser: string = UNOAPI_JOB_BULK_PARSER, queueReload: string = UNOAPI_JOB_RELOAD) {
    this.outgoing = outgoing
    this.getConfig = getConfig
    this.queueBulkParser = queueBulkParser
    this.queueReload = queueReload
  }

  async consume(data: object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { phone, payload } = data as any
    logger.debug(
      `Commander type: ${payload.type} caption: ${payload?.document?.caption} link: ${payload?.document?.link} template: ${payload?.template?.name}`,
    )

    try {
      if (payload.type === 'document' && payload?.document?.caption?.toLowerCase() == 'campanha') {
        logger.debug(`Commander processing`)
        const id = uuid()
        await amqpEnqueue(this.queueBulkParser, phone, {
          phone,
          payload: {
            id,
            phone,
            template: 'sisodonto',
            url: payload?.document?.link,
          },
        })
        const message = {
          type: 'text',
          text: {
            body: `The bulk ${id} is created and wil be parsed!`,
          },
          messageTimestamp: new Date().getTime(),
        }
        this.outgoing.formatAndSend(phone, phone, message)
      } else if (payload?.to && phone === payload?.to && payload?.template && payload?.template.name == 'unoapi-webhook') {
        logger.debug('Parsing webhook template... %s', phone)
        const service = new Template(this.getConfig)
        const { text } = await service.bind(phone, payload?.template.name, payload?.template.components)
        logger.debug('Template webhook content %s', text)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = parseDocument(text)
        if (doc.errors.length) {
          throw new YamlParseError(doc.errors)
        }
        const webhook = doc.toJS()
        const webhooks = [webhook]
        const config = { webhooks }
        logger.debug('Template webhooks %s', phone, JSON.stringify(webhooks))
        await setConfig(phone, config)
        await amqpEnqueue(this.queueReload, '', { phone })
      } else if (payload?.to && phone === payload?.to && payload?.template && payload?.template.name == 'unoapi-bulk-report') {
        logger.debug('Parsing bulk report template... %s', phone)
        const service = new Template(this.getConfig)
        const { text } = await service.bind(phone, payload?.template.name, payload?.template.components)
        logger.debug('Template bulk report content %s', text)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = parseDocument(text)
        if (doc.errors.length) {
          throw new YamlParseError(doc.errors)
        }
        const { bulk } = doc.toJS()
        await amqpEnqueue(UNOAPI_JOB_BULK_REPORT, phone, { phone, payload: { phone, id: bulk, unverified: true } })
      } else if (payload?.to && phone === payload?.to && payload?.template && payload?.template.name == 'unoapi-config') {
        logger.debug('Parsing config template... %s', phone)
        const service = new Template(this.getConfig)
        const { text } = await service.bind(phone, payload?.template.name, payload?.template.components)
        const doc = parseDocument(text)
        if (doc.errors.length) {
          throw new YamlParseError(doc.errors)
        }
        const configParsed = doc.toJS() || {}
        logger.debug('Config template parsed %s', phone, JSON.stringify(configParsed))
        const keys = Object.keys(configParsed)
        const configToUpdate = keys.reduce((acc, key) => {
          if (configParsed[key]) {
            acc[key] = configParsed[key]
          }
          return acc
        }, {})
        logger.debug('Config template to update %s', phone, JSON.stringify(configToUpdate))
        await setConfig(phone, configToUpdate)
        await amqpEnqueue(this.queueReload, '', { phone })
      } else {
        logger.debug(`Commander ignore`)
      }
    } catch (error) {
      if (error instanceof YamlParseError) {
        const message = `Error os parse yml ${JSON.stringify(error.errors)}`
        const payload = {
          type: 'text',
          to: phone,
          text: {
            body: message,
          },
        }
        await this.outgoing.formatAndSend(phone, phone, payload)
      } else {
        throw error
      }
    }
  }
}
