<template>
  <div id="app">
    <DashboardGrid />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import DashboardGrid from './components/DashboardGrid.vue'

onMounted(() => {
  // Config auto-fetches via composable
  console.log('Dashboard initialized')
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0a0a0a;
  color: #e0e0e0;
}

#app {
  min-height: 100vh;
}

/* Mobile first - stacked layout */
.container {
  display: flex;
  flex-direction: column;
}

/* Desktop - side-by-side */
@media (min-width: 1024px) {
  .container {
    flex-direction: row;
  }
}

</style>
