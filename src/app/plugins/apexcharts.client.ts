import VueApexCharts from 'vue3-apexcharts'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueApexCharts)
  nuxtApp.vueApp.component('ApexChart', VueApexCharts)
})
