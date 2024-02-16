import * as Prometheus from 'prom-client';

export default class Metrics{
	static http_requests_total = new Prometheus.Counter({ name: 'http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'endpoint'] as const});
	static http_concurrent_requests_total = new Prometheus.Gauge({ name: 'http_concurrent_requests_total', help: 'Total HTTP concurrent requests' as const});
	static http_auth_requests_total = new Prometheus.Counter({ name: 'http_auth_requests_total', help: 'Total Authorized HTTP requests', labelNames: ['endpoint', 'username'] as const});
	static http_request_duration = new Prometheus.Histogram({ name: 'http_request_duration', help: 'Duration of HTTP requests in milliseconds', labelNames: ['endpoint'], buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]});
}