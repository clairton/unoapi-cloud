import http from '../http-common'

const findOptions = async (instanceName) => {
  return await http
    .get('/settings/find/:instance', {
      params: {
        instance: instanceName,
      },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const setOptions = async (instanceName, data) => {
  return await http
    .post('/settings/set/:instance', data, {
      params: {
        instance: instanceName,
      },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const findWebhook = async (instanceName) => {
  return await http
    .get('/webhook/find/:instance', {
      params: {
        instance: instanceName,
      },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const setWebhook = async (instanceName, data) => {
  return await http
    .post('/webhook/set/:instance', data, {
      params: {
        instance: instanceName,
      },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const findWebsocket = async (instanceName) => {
  return await http
    .get('/websocket/find/:instance', {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const setWebsocket = async (instanceName, data) => {
  return await http
    .post('/websocket/set/:instance', data, {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const findRabbitmq = async (instanceName) => {
  return await http
    .get('/rabbitmq/find/:instance', {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const setRabbitmq = async (instanceName, data) => {
  return await http
    .post('/rabbitmq/set/:instance', data, {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const findChatwoot = async (instanceName) => {
  return await http
    .get('/chatwoot/find/:instance', {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const setChatwoot = async (instanceName, data) => {
  return await http
    .post('/chatwoot/set/:instance', data, {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const findTypebot = async (instanceName) => {
  return await http
    .get('/typebot/find/:instance', {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const setTypebot = async (instanceName, data) => {
  return await http
    .post('/typebot/set/:instance', data, {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const changeTypebotStatus = async (instanceName, data) => {
  return await http
    .post('/typebot/changeStatus/:instance', data, {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

export default {
  options: {
    get: findOptions,
    set: setOptions,
  },

  webhook: {
    get: findWebhook,
    set: setWebhook,
  },
  websocket: {
    get: findWebsocket,
    set: setWebsocket,
  },
  rabbitmq: {
    get: findRabbitmq,
    set: setRabbitmq,
  },
  chatwoot: {
    get: findChatwoot,
    set: setChatwoot,
  },
  typebot: {
    get: findTypebot,
    set: setTypebot,
    changeStatus: changeTypebotStatus,
  },
}
