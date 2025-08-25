// src/api.ts
import axios from "axios";

const baseURL =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost" ? "http://localhost:4000" : "");

const api = axios.create({ baseURL });
export default api;

