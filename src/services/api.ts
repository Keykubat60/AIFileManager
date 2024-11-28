import axios from 'axios';
import { ProcessedFile } from '../utils/fileProcessing';

const API_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 100000, // Increased timeout for PDF processing
});

export const uploadPDF = async (file: File): Promise<ProcessedFile> => {
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      id: response.data.id,
      name: file.name,
      suggestedFolder: response.data.suggestedFolder,
      dateAdded: new Date(),
      content: response.data.content,
      path: response.data.path
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      throw new Error(`Failed to upload PDF: ${message}`);
    }
    throw error;
  }
};

export const searchDocuments = async (query: string): Promise<ProcessedFile[]> => {
  try {
    const response = await api.get('/search', {
      params: { query },
    });
    
    const docData = response.data;
    console.log("api search ",docData);
    return docData;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      throw new Error(`Failed to search documents: ${message}`);
    }
    throw error;
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.data.status === 'healthy';
  } catch {
    return false;
  }
};