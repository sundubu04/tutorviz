# TutoriAI

A comprehensive classroom management system with AI-powered features.

## 🚀 Quick Start with Docker

The easiest way to run TutoriAI is using Docker Compose, which will set up all services (frontend, backend, and database) automatically.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)

### Development Mode (Recommended for development)

```bash
# Start all services in development mode
./docker.sh start dev

# Or manually with docker-compose
docker-compose -f docker-compose.dev.yml up -d
```

**Services will be available at:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- PostgreSQL: localhost:5432

### Production Mode

```bash
# Start all services in production mode
./docker.sh start prod

# Or manually with docker-compose
docker-compose up -d
```

### Docker Management Commands

```bash
# View all available commands
./docker.sh help

# Start services
./docker.sh start [dev|prod]

# Stop services
./docker.sh stop [dev|prod]

# Restart services
./docker.sh restart [dev|prod]

# View logs
./docker.sh logs [dev|prod] [service_name]

# Build services
./docker.sh build [dev|prod]

# Check service status
./docker.sh status [dev|prod]

# Clean up all Docker resources
./docker.sh cleanup
```

### Development Features

- **Hot Reloading**: Frontend and backend automatically reload when you make changes
- **Volume Mounting**: Your local code is mounted into containers for live development
- **Database Persistence**: PostgreSQL data is preserved between container restarts
- **Environment Separation**: Separate configurations for development and production

## 🛠️ Manual Setup (Alternative)

If you prefer not to use Docker, you can set up the services manually:

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

### Database Setup

1. Install PostgreSQL
2. Create a database named `tutoriai`
3. Run the initialization scripts in `backend/docker/postgres/`

## 📁 Project Structure

```
TutoriAI/
├── frontend/                 # React TypeScript application
├── backend/                  # Node.js Express API
├── docker/                   # Docker configurations
│   ├── postgres/            # Database initialization scripts
│   └── Dockerfile           # Backend container
├── docker-compose.yml        # Production Docker setup
├── docker-compose.dev.yml    # Development Docker setup
├── Dockerfile               # Frontend container
├── nginx.conf               # Nginx configuration
├── docker.sh                # Docker management script
└── README.md                # This file
```

## 🔧 Configuration

### Environment Variables

The following environment variables can be configured:

**Backend:**
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5001)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CORS_ORIGIN`: Allowed CORS origin

**Frontend:**
- `REACT_APP_API_BASE`: API base path or URL (default local dev: `http://localhost:5001/api`; production Docker build uses `/api`)
- `REACT_APP_BACKEND_URL` / `REACT_APP_API_URL`: Optional origin for cross-origin dev (see [`frontend/src/config/api.ts`](frontend/src/config/api.ts))

### Database

The PostgreSQL database is automatically initialized with:
- User tables and authentication
- Class management system
- Assignment tracking
- Calendar events
- Task management

## 🚀 Deployment

### Production (VPS + Supabase Cloud)

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for GitHub Actions deploy (per-variable secrets that write `.env` on the server each deploy), Supabase dashboard settings, TLS, and Prisma migrations.

On the server:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

GitHub Actions (push to `main`) can run the same via SSH; configure secrets as described in `docs/DEPLOY.md`.

### Local / dev Docker

- **Development**: `./docker.sh start dev` or `docker compose -f docker-compose.dev.yml up -d`
- **Production images locally**: `docker compose -f docker-compose.prod.yml build`

### Environment-Specific Configurations

- **Development**: Uses volume mounts for live code editing and hot reloading
- **Production**: [`docker-compose.prod.yml`](docker-compose.prod.yml) — nginx serves the SPA and proxies `/api` to the backend container

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5001, and 5432 are available
2. **Permission errors**: Make sure Docker has proper permissions
3. **Database connection**: Wait for PostgreSQL to be healthy before starting backend

### Logs and Debugging

```bash
# View all service logs
./docker.sh logs dev

# View specific service logs
./docker.sh logs dev backend

# Check service status
./docker.sh status dev
```

### Reset Everything

```bash
# Clean up all Docker resources and start fresh
./docker.sh cleanup
./docker.sh start dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker: `./docker.sh start dev`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

For more detailed information about specific features, see the `docs/` directory.
