<!-- App.vue -->
<template>
  <div class="container">
    <h1>Polygon Stock Trades Monitor</h1>

    <div class="controls">
      <button class="start-btn" @click="start" :disabled="isConnected">Start</button>
      <button class="stop-btn" @click="stop" :disabled="!isConnected">Stop</button>
    </div>

    <div :class="['status', isConnected ? 'connected' : 'disconnected']">
      Status: {{ isConnected ? 'Connected' : 'Disconnected' }}
    </div>

    <div v-if="isConnected || trades.length > 0" class="statistics">
      <div class="stats-section">
        <h3>--- Past 5 seconds ---</h3>
        <div class="stat-row">Tickers seen (5s): {{ stats.tickersSeen5s.toLocaleString() }}</div>
        <div class="stat-row">Trades seen (5s): {{ stats.tradesSeen5s.toLocaleString() }}</div>
        <div class="stat-row">Cash traded (5s): {{ formatCurrency(stats.cashTraded5s) }}</div>
      </div>

      <div class="stats-section">
        <h3>--- Running Totals ---</h3>
        <div class="stat-row">Total Tickers seen: {{ stats.totalTickers.toLocaleString() }}</div>
        <div class="stat-row">Total Trades seen: {{ stats.totalTrades.toLocaleString() }}</div>
        <div class="stat-row">Total Cash traded: {{ formatCurrency(stats.totalCash) }}</div>
      </div>
    </div>

    <div v-if="trades.length > 0">
      <table>
        <thead>
        <tr>
          <th>Ticker</th>
          <th @click="sortBy('trades5s')" :class="getSortClass('trades5s')">Trades (5s)</th>
          <th @click="sortBy('cash5s')" :class="getSortClass('cash5s')">Cash (5s)</th>
          <th @click="sortBy('totalTrades')" :class="getSortClass('totalTrades')">Total Trades</th>
          <th @click="sortBy('totalCash')" :class="getSortClass('totalCash')">Total Cash</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="trade in displayedTrades" :key="trade.symbol">
          <td>{{ trade.symbol }}</td>
          <td>{{ trade.trades5s.toLocaleString() }}</td>
          <td>{{ formatCurrency(trade.cash5s) }}</td>
          <td>{{ trade.totalTrades.toLocaleString() }}</td>
          <td>{{ formatCurrency(trade.totalCash) }}</td>
        </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="no-data">
      No trade data available. Click Start to begin monitoring.
    </div>

    <div v-if="isConnected" class="footer">
      Current Time: {{ currentTime }} | App Uptime: {{ uptime }}
    </div>
  </div>
</template>

<script src="./Top.js"></script>

<style scoped>
.container {
  max-width: 1400px;
  margin: 0 auto;
  background: #000000;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.controls {
  margin-bottom: 20px;
}

button {
  padding: 10px 20px;
  margin-right: 10px;
  font-size: 16px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.start-btn {
  background-color: #4CAF50;
  color: white;
}

.start-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.stop-btn {
  background-color: #f44336;
  color: white;
}

.stop-btn:hover:not(:disabled) {
  background-color: #da190b;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 4px;
  font-weight: bold;
}

.status.connected {
  background-color: #d4edda;
  color: #155724;
}

.status.disconnected {
  background-color: #f8d7da;
  color: #721c24;
}

.statistics {
  display: flex;
  gap: 40px;
  margin: 20px 0;
  padding: 20px;
  background-color: #000000;
  border-radius: 4px;
  font-family: monospace;
}

.stats-section {
  flex: 1;
}

.stats-section h3 {
  margin: 0 0 10px 0;
  color: #ff0000;
  font-size: 14px;
}

.stat-row {
  padding: 4px 0;
  font-size: 13px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #4CAF50;
  color: white;
  user-select: none;
}

th:not(:first-child) {
  cursor: pointer;
}

th:not(:first-child):hover {
  background-color: #45a049;
}

th.sorted-asc::after {
  content: " ▲";
}

th.sorted-desc::after {
  content: " ▼";
}

td:nth-child(2), td:nth-child(3), td:nth-child(4), td:nth-child(5) {
  text-align: right;
}

th:nth-child(2), th:nth-child(3), th:nth-child(4), th:nth-child(5) {
  text-align: right;
}

tr:hover {
  background-color: #f5f5f5;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #666;
}

.footer {
  margin-top: 20px;
  padding: 10px;
  text-align: center;
  color: #666;
  font-size: 14px;
  border-top: 1px solid #ddd;
}
</style>
