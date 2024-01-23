import http from '../http-common'

const getAll = async (instanceName) => {
  return await http
    .get('/group/fetchAllGroups/:instance/?getParticipants=false', {
      params: {
        instance: instanceName,
      },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const getById = async (instanceName, groupId) => {
  return await http
    .get(`/group/findGroupInfos/:instance/?groupJid=${groupId}`, {
      params: { instance: instanceName },
    })
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

const updateParticipant = async (instanceName, groupId, action, participants) => {
  return await http
    .put(
      `/group/updateParticipant/:instance/?groupJid=${groupId}`,
      {
        action,
        participants, // Array of participants phone numbers
      },
      {
        params: { instance: instanceName },
      },
    )
    .then((r) => r.data)
    .catch((error) => {
      throw error.response?.data || error.response || error
    })
}

export default {
  getAll: getAll,
  getById: getById,
  updateParticipant: updateParticipant,
}
