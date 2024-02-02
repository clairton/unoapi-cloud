// Utilities
import axios from 'axios'
import { defineStore } from 'pinia'
import semver from 'semver'

export const useAppStore = defineStore('app', {
  getters: {
    validConnection: (state) => state.connection.valid,
    instances: (state) => state.instancesList,
    getInstance: (state) => (instanceName) => state.instancesList.find((instance) => instance.instance.instanceName === instanceName),
    getInstanceApiKey: (state) => (instance) => {
      return state.getInstance(instance).instance.apiKey || state.instancesKeys[instance]
    },
    version: (state) => state.connection.version,
    versionSatisfies: (state) => (version) => {
      return semver.satisfies(state.connection.version, version)
    },
  },
  state: () => ({
    connecting: false,
    connection: {
      valid: false,
      host: null,
      globalApiKey: null,
    },
    instancesKeys: {},
    instancesList: [],

    // lista de "contatos" de conexoes
    connectionsList: [],
  }),

  actions: {
    async setConnection({ host, globalApiKey }) {
      try {
        this.connecting = true
        const apiResponse = await axios({
          method: 'GET',
          baseURL: host,
          headers: {
            'Content-Type': 'application/json',
            apikey: globalApiKey,
          },
          url: '/manager',
        })

        if (!apiResponse.data || !apiResponse.data.message || !apiResponse.data.message.includes('UnoAPI')) {
          throw new Error('Essa conexão não é uma instância da UnoAPI')
        }

        const { version } = apiResponse.data

        const response = await axios({
          method: 'GET',
          baseURL: host,
          headers: {
            'Content-Type': 'application/json',
            apikey: globalApiKey,
          },
          url: '/manager/list',
        })

        this.saveConnection({ host, globalApiKey, version })
        this.instancesList = response.data
      } catch (e) {
        this.connection.valid = false
        throw e.response?.data?.response?.message || e.response || e
      } finally {
        this.connecting = false
      }
    },

    async loadInstance(instanceName) {
      try {
        // eslint-disable-next-line no-console
        console.log('loadInstance', instanceName)
        return this.reconnect()
      } catch (e) {
        this.connection.valid = false
        throw e.response?.data?.response?.message || e.response || e
      }
    },
    async logout() {
      this.connection = {
        valid: false,
        host: null,
        globalApiKey: null,
      }
      this.instancesList = []
      this.instancesKeys = {}
      this.connectionsList = []
      this.saveLocalStorage()
    },

    async reconnect() {
      try {
        const { host, globalApiKey } = this.connection
        if (!host || !globalApiKey) throw new Error('Invalid connection')

        const apiResponse = await axios({
          method: 'GET',
          baseURL: host,
          headers: {
            'Content-Type': 'application/json',
            apikey: globalApiKey,
          },
          url: '/',
        })

        if (!apiResponse.data || !apiResponse.data.message || !apiResponse.data.message.includes('UnoAPI')) {
          throw new Error('Essa conexão não é uma instância da UnoAPI')
        }

        const { version } = apiResponse.data

        const response = await axios({
          method: 'GET',
          baseURL: host,
          headers: {
            'Content-Type': 'application/json',
            apikey: globalApiKey,
          },
          url: '/instance/fetchInstances',
        })

        this.saveConnection({ host, globalApiKey, version })

        this.instancesList = response.data
      } catch (e) {
        this.connection.valid = false
        throw e.response?.data?.response?.message || e.response || e
      } finally {
        this.connecting = false
      }
    },

    setInstanceStatus(instance, status) {
      const index = this.instancesList.findIndex((instance) => instance.instance.instanceName === instance)
      this.instancesList[index].instance.status = status
    },

    setPhoto(instanceName, photo) {
      const index = this.instancesList.findIndex((instance) => instance.instance.instanceName === instanceName)
      if (index !== -1) this.instancesList[index].instance.profilePictureUrl = photo
    },

    addInstanceKey({ instance, key }) {
      this.instancesKeys[instance] = key
    },

    removeConnection({ host }) {
      const currentKey = this.connectionsList.findIndex((item) => item.host === host)

      if (currentKey !== -1) this.connectionsList.splice(currentKey, 1)

      this.saveLocalStorage()
    },
    saveConnection({ host, globalApiKey, version }) {
      this.connection = {
        valid: true,
        host,
        globalApiKey,
        version,
      }

      const currentKey = this.connectionsList.findIndex((item) => item.host === host)
      if (currentKey === -1) {
        this.connectionsList.push({ host, globalApiKey })
      } else {
        this.connectionsList[currentKey] = { host, globalApiKey }
      }

      this.saveLocalStorage()
    },

    saveLocalStorage() {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('connection', JSON.stringify(this.connection))
        window.localStorage.setItem('connectionsList', JSON.stringify(this.connectionsList))
      }
    },
    async loadConnection() {
      if (typeof window !== 'undefined') {
        const connectionsList = window.localStorage.getItem('connectionsList')
        if (connectionsList) {
          this.connectionsList = JSON.parse(connectionsList || '[]')
        }

        const connection = window.localStorage.getItem('connection')
        if (connection) {
          this.connection = JSON.parse(connection || '{}')
          this.connecting = true
          return this.reconnect()
        }
      }
    },
  },
})
