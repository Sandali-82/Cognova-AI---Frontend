import axiosClient from './axiosClient'

export const getAnalyticsDashboard = () => axiosClient.get('/analytics/dashboard/')