import axiosClient from './axiosClient'

export const generateQuiz = (documentId) =>
  axiosClient.post(`/documents/${documentId}/generate-quiz/`)

export const submitQuiz = (quizId, answers) =>
  axiosClient.post(`/quizzes/${quizId}/submit/`, { answers })