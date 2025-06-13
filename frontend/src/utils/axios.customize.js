import axios from "axios";

const baseUrl = "http://localhost:3000";

const customFetch = axios.create({
    baseURL: baseUrl,
    withCredentials: true, // allow to pass with cookies
});

// Remove the interceptor since we're now passing the token directly in the components
export default customFetch 