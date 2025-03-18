import { amqpPublish } from '../amqp'
import { UNOAPI_JOB_LOGOUT } from '../defaults'
import { Logout } from './logout'

export class LogoutAmqp implements Logout {
  private queueName: string

  constructor(queueName: string = UNOAPI_JOB_LOGOUT) {
    this.queueName = queueName
  }

  public async run(phone: string) {
    await amqpPublish(this.queueName, '', { phone })
  }
}
