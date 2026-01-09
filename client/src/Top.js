// src/App.js
import { websocketClient } from "@polygon.io/client-js";

export default {
    name: 'App',
    data() {
        return {
            ws: null,
            isConnected: false,
            tradeMap: new Map(),
            totalTradeMap: new Map(),
            trades: [],
            sortKey: 'trades5s',
            sortOrder: 'desc',
            maxTrades: 10,
            updateInterval: null,
            timeInterval: null,
            wsEndpoint: 'wss://socket.polygon.io/stocks', // 'wss://socket.massive.com',
            apiKey: '', // Replace with your Polygon.io API key
            subscriptions: [],
            startTime: null,
            uptime: '00:00:00',
            currentTime: '',
            stats: {
                tickersSeen5s: 0,
                tradesSeen5s: 0,
                cashTraded5s: 0,
                totalTickers: 0,
                totalTrades: 0,
                totalCash: 0
            }
        };
    },
    async mounted() {
      await this.fetchConfig();
    },
    computed: {
        sortedTrades() {
            return [...this.trades].sort((a, b) => {
                const aVal = a[this.sortKey];
                const bVal = b[this.sortKey];

                if (this.sortOrder === 'asc') {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                } else {
                    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                }
            });
        },
        displayedTrades() {
            return this.sortedTrades.slice(0, this.maxTrades);
        }
    },
    methods: {
        async fetchConfig() {
            try {
                const response = await fetch('/api/get_config', {
                    credentials: 'include' // Include session cookie
                });
                if (response.ok) {
                    const data = await response.json();
                    this.apiKey = data.api_key;
                    this.subscriptions = data.subscriptions;
                } else {
                    console.error('Failed to fetch config');
                }
            } catch (error) {
                console.error('Error fetching config:', error);
            }
        },

        start() {
            if (!this.apiKey) {
                alert('API key not configured. Please contact administrator.');
                return;
            }
            // this.ws  = websocketClient(this.apiKey, this.wsEndpoint).stocks();
            this.ws = new WebSocket(this.wsEndpoint);
            this.startTime = Date.now();

            this.ws.onopen = () => {
                this.ws.send(JSON.stringify({ action: 'auth', params: this.apiKey }));
                this.ws.send(JSON.stringify({ action: 'subscribe', params: this.subscriptions }));
                this.isConnected = true;
                console.log('WebSocket connected');

                this.updateInterval = setInterval(() => {
                    this.updateTrades();
                }, 5000);

                this.timeInterval = setInterval(() => {
                    this.updateTime();
                    this.updateUptime();
                }, 1000);
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                data.forEach(msg => {
                  if (msg.ev === 'T') {
                    const symbol = msg.sym;
                    const price = msg.p || 0;
                    const size = msg.s || 0;
                    const cash = price * size;

                    const current = this.tradeMap.get(symbol) || { trades: 0, cash: 0 };
                    this.tradeMap.set(symbol, {
                      trades: current.trades + 1,
                      cash: current.cash + cash
                    });

                    const total = this.totalTradeMap.get(symbol) || { trades: 0, cash: 0 };
                    this.totalTradeMap.set(symbol, {
                      trades: total.trades + 1,
                      cash: total.cash + cash
                    });
                  }
                });
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                    this.updateInterval = null;
                }
                if (this.timeInterval) {
                    clearInterval(this.timeInterval);
                    this.timeInterval = null;
                }
            };
        },
        stop() {
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            if (this.timeInterval) {
                clearInterval(this.timeInterval);
                this.timeInterval = null;
            }
            this.tradeMap.clear();
            this.totalTradeMap.clear();
            this.trades = [];
            this.startTime = null;
            this.stats = {
                tickersSeen5s: 0,
                tradesSeen5s: 0,
                cashTraded5s: 0,
                totalTickers: 0,
                totalTrades: 0,
                totalCash: 0
            };
        },
        updateTrades() {
            const allSymbols = new Set([...this.tradeMap.keys(), ...this.totalTradeMap.keys()]);

            this.stats.tickersSeen5s = this.tradeMap.size;
            this.stats.tradesSeen5s = 0;
            this.stats.cashTraded5s = 0;
            this.stats.totalTickers = this.totalTradeMap.size;
            this.stats.totalTrades = 0;
            this.stats.totalCash = 0;

            this.trades = Array.from(allSymbols).map(symbol => {
                const current = this.tradeMap.get(symbol) || { trades: 0, cash: 0 };
                const total = this.totalTradeMap.get(symbol) || { trades: 0, cash: 0 };

                this.stats.tradesSeen5s += current.trades;
                this.stats.cashTraded5s += current.cash;
                this.stats.totalTrades += total.trades;
                this.stats.totalCash += total.cash;

                return {
                    symbol,
                    trades5s: current.trades,
                    cash5s: current.cash,
                    totalTrades: total.trades,
                    totalCash: total.cash
                };
            });

            this.tradeMap.clear();
        },
        updateTime() {
            const now = new Date();
            this.currentTime = now.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        },
        updateUptime() {
            if (!this.startTime) return '00:00:00';
            const elapsed = Date.now() - this.startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.uptime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        },
        sortBy(key) {
            if (this.sortKey === key) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortKey = key;
                this.sortOrder = 'desc';
            }
        },
        getSortClass(key) {
            if (this.sortKey === key) {
                return `sorted-${this.sortOrder}`;
            }
            return '';
        },
        formatCurrency(value) {
            return value.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    },
    beforeUnmount() {
        this.stop();
    }
};
