import http from '../http-common'

const updateName = async (instanceName, name) => {
  return await http
    .post(
      '/chat/updateProfileName/:instance',
      { name },
      {
        params: {
          instance: instanceName,
        },
      },
    )
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const updateStatus = async (instanceName, status) => {
  return await http
    .post(
      '/chat/updateProfileStatus/:instance',
      { status },
      {
        params: {
          instance: instanceName,
        },
      },
    )
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const getPrivacy = async (instanceName) => {
  return await http
    .get('/chat/fetchPrivacySettings/:instance', {
      params: {
        instance: instanceName,
      },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const updatePrivacy = async (instanceName, privacySettings) => {
  return await http
    .put(
      '/chat/updatePrivacySettings/:instance',
      { privacySettings },
      {
        params: {
          instance: instanceName,
        },
      },
    )
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const removePicture = async (instanceName) => {
  return await http
    .delete('/chat/removeProfilePicture/:instance', {
      params: {
        instance: instanceName,
      },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}
const updatePicture = async (instanceName, picture) => {
  return await http
    .put(
      '/chat/updateProfilePicture/:instance',
      { picture },
      {
        params: {
          instance: instanceName,
        },
      },
    )
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

export default {
  updateName: updateName,
  updateStatus: updateStatus,
  getPrivacy: getPrivacy,
  updatePrivacy: updatePrivacy,
  removePicture: removePicture,
  updatePicture: updatePicture,
}
