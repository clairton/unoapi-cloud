const { ELASTIC_APM_SECRET_TOKEN, ELASTIC_APM_SERVER_URL } = process.env

import apm from 'elastic-apm-node'

export const start = () => {
  if (ELASTIC_APM_SECRET_TOKEN && ELASTIC_APM_SERVER_URL) {
    apm.start({
      serviceName: 'UNOAPI',
      serverUrl: ELASTIC_APM_SERVER_URL,
      secretToken: ELASTIC_APM_SECRET_TOKEN
    })
  }
}
