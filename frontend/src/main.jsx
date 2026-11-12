import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "./index.css";
// import "./App.css";
import './assets/styles/variables.css';

// Khởi phục theme đã lưu từ localStorage
const savedTheme = localStorage.getItem('app-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

ReactDOM.createRoot(
    document.getElementById("root")
).render(

    <React.StrictMode>

        <App />

    </React.StrictMode>

);