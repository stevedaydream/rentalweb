
import { createApp } from 'vue'
import { createPinia } from 'pinia' // 新增
import './style.css'
import App from './App.vue'
import router from './router'// src/main.ts



const app = createApp(App)
const pinia = createPinia() // 新增


app.use(pinia) // 新增
app.use(router)
app.mount('#app')