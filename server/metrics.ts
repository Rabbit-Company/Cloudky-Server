import * as Prometheus from 'prom-client';

export default class Metrics{
	static http_requests_total = new Prometheus.Counter({ name: 'http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'endpoint'] as const});
	static http_auth_requests_total = new Prometheus.Counter({ name: 'http_auth_requests_total', help: 'Total Authorized HTTP requests', labelNames: ['endpoint', 'username'] as const});
}