import api from '../../services/api'
import axios from 'axios'
export const getServices = async () => {
  // The /outlets endpoint defaults to limit=20, but the outlet selector and the
  // outlets list need EVERY outlet — fetch all (same approach as areas/menuCategories).
  const { data } = await axios.get(api.allServices(), { params: { limit: 100000 } })
  return {
    data: data,
  }
}
export const deleteOutlet = async (payload) => {
  return await axios.delete(api.allServices() + '/' + payload)
}
export const getAreas = async (payload) => {
  const { data } = await axios.get(api.allAreas(payload))
  return {
    data: data,
  }
}
export const saveArea = async (payload) => {
  return axios.post(api.saveArea(), payload)
}

export const updateArea = async (payload) => {
  return axios.patch(api.saveArea() + '/' + payload.id, payload.data)
}

export const deleteArea = async (payload) => {
  return axios.delete(api.deleteArea(payload))
}
export const createTable = async (payload) => {
  return axios.post(api.createTable(), payload)
}

export const updateTable = async (payload) => {
  return axios.patch(api.createTable() + '/' + payload.id, payload.data)
}

export const deleteTable = async (payload) => {
  return axios.delete(api.deleteTable(payload))
}
