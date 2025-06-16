import logger from "../services/logger";

export class WebhookStatusFailedJob {
  private url: string

  constructor(url: string) {
    this.url = url
  }

  async consume(phone: string, data: object) {
    const { payload } = data as any
    const text = `Session ${phone}, failed status ${JSON.stringify(payload)}`
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ text }),
      });
    } catch (error) {
      logger.error('Error on webhook status failed')
      logger.error(error)
      throw error
    }
  }
}
