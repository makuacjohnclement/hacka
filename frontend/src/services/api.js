import axios from 'axios';
import { auth } from '../config/firebase';

const API_BASE_URL = 'http://localhost:8000';

axios.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

export const submitIncident = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/incident`, data);
  return response.data;
};

export const submitCitizenIncident = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/incident/citizen`, data);
  return response.data;
};

export const fetchPendingIncidents = async () => {
  const response = await axios.get(`${API_BASE_URL}/pending_incidents`);
  return response.data;
};

export const dispatchPendingIncident = async (incidentId) => {
  const response = await axios.post(`${API_BASE_URL}/incident/${incidentId}/dispatch`);
  return response.data;
};

export const fetchActiveIncidents = async () => {
  const response = await axios.get(`${API_BASE_URL}/active_incidents`);
  return response.data;
};

export const fetchTopAreas = async (limit = 5) => {
  const response = await axios.get(`${API_BASE_URL}/stats/top_areas?limit=${limit}`);
  return response.data;
};

export const resolveIncident = async (id) => {
  const response = await axios.post(`${API_BASE_URL}/incident/${id}/resolve`);
  return response.data;
};

export const fetchMyIncidents = async () => {
  const response = await axios.get(`${API_BASE_URL}/my_incidents`);
  return response.data;
};

export const getPdfReportUrl = () => `${API_BASE_URL}/reports/pdf`;
export const getExcelReportUrl = () => `${API_BASE_URL}/reports/excel`;
