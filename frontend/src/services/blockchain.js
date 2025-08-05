import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const uploadImageToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${BASE_URL}/api/upload-ipfs`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });

    if (!response.data?.hash) {
      throw new Error('No IPFS hash returned from server.');
    }

    return response.data.hash;
  } catch (error) {
    console.error('IPFS upload error:', error?.response?.data || error.message);
    throw error;
  }
};

export const createBatchOnBlockchain = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/create-batch`, data, {
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    console.error('Blockchain batch creation error:', error?.response?.data || error.message);
    throw error;
  }
};