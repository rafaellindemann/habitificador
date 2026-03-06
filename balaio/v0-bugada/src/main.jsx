import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
// import AuthProvider from './context/AuthContext'
// import DataProvider from './context/DataContext'
// import { registerSW } from './sw-register'
// // registerSW()
ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
<App/>
{/* <AuthProvider>
<DataProvider>
</DataProvider>
</AuthProvider> */}
</React.StrictMode>
)