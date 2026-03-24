import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // ajuste para seu NestJS
});

export const getProdutos = async () => {
  const response = await api.get('/produto');
  return response.data;
};
