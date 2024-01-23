import { useAppStore } from '@/store/app'
import axios from 'axios'

const appStore = useAppStore()

appStore

const http = axios.create({
  headers: {
    'Content-type': 'application/json',
  },
})

http.interceptors.request.use(
  (config) => {
    config.baseURL = appStore.connection.host
    config.headers['apikey'] = appStore.connection.globalApiKey

    // find all uri variables and replace them with the value from the params object
    // e.g. /instance/connect/:instance -> /instance/connect/instance1
    const params = Object.entries(config.params || {})
    if (params.length > 0) {
      config.url = config.url.replace(/:(\w+)/g, (_, key) => {
        const value = params.find(([k]) => k === key)?.[1]
        if (value) {
          delete config.params[key]
          return value
        }
        return _
      })

      if (params.instance) {
        const apikey = appStore.getInstanceApiKey(params.instance)
        if (apikey) config.headers['apikey'] = apikey
      }
    }

    return config
  },
  (error) => Promise.reject(error),
)

export default http
