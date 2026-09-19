import axiosClient from './axiosClient'

export const getDocuments = () => axiosClient.get('/documents/')

export const uploadDocument = (formData) =>
  axiosClient.post('/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const generateSummary = (documentId) =>
  axiosClient.post(`/documents/${documentId}/summarize/`)