import axiosClient from './axiosClient'

export const processDocumentForChat = (documentId) =>
  axiosClient.post(`/documents/${documentId}/process-for-chat/`)

export const chatWithDocument = (documentId, question) =>
  axiosClient.post(`/documents/${documentId}/chat/`, { question })