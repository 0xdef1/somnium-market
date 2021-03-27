import Vue from 'vue'
import VueRouter from 'vue-router'
import SomniumMarket from '../views/somnium.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'SomniumMarket',
    component: SomniumMarket
  },
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
