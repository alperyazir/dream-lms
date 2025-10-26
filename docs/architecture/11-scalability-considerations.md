# 11. Scalability Considerations

## 11.1 Current MVP Limitations

- **Single VPS**: All services on one server
- **Vertical Scaling Only**: Add more CPU/RAM to existing server
- **PostgreSQL Bottleneck**: Single database instance
- **No Auto-Scaling**: Manual intervention for traffic spikes

**Capacity Estimate:**
- 100-1000 concurrent users
- 10,000 total users
- 50,000 assignments/month

## 11.2 Scaling Path

**Phase 2: Separate Database (Month 3-6)**
- Move PostgreSQL to managed service (AWS RDS, DigitalOcean Managed DB)
- Enable read replicas for analytics queries
- Implement connection pooling (PgBouncer)

**Phase 3: Horizontal Scaling (Month 6-12)**
- Deploy multiple app servers behind load balancer
- Implement sticky sessions for WebSocket (future real-time features)
- Use Redis for distributed session storage

**Phase 4: Kubernetes (Year 2)**
- Migrate to Kubernetes for auto-scaling
- Implement microservices (analytics service, notification service)
- Use message queue (RabbitMQ/Kafka) for async tasks

---
