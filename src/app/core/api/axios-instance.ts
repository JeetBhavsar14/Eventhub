import axios from "axios";
import { config } from "rxjs";

export const axiosInstance=axios.create({
    baseURL:'http://localhost:3000',
    timeout: 10000,
    headers:{
        "Content-Type":"application/json",
    },
});
axiosInstance.interceptors.request.use(
  (config) => {
    // 1. Read token from local storage directly (avoids circular dependency)
    const storedToken = localStorage.getItem('eventhub_token');
    
    // 2. If token exists, parse it and attach it to the headers
    if (storedToken) {
      try {
        // LocalStorage saves it as a JSON string (e.g., '"eyJhbG..."')
        const parsedToken = JSON.parse(storedToken);
        config.headers['Authorization'] = `Bearer ${parsedToken}`;
      } catch (e) {
        // If parsing fails, just ignore and send without token
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);