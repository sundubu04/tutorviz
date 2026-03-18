# Docker Development Setup with Hot Reloading

This guide explains how to set up and use the TutoriAI development environment with Docker, featuring automatic file change detection and hot reloading.

## Overview

The development Docker setup provides:
- **Hot reloading** for both frontend and backend
- **Automatic file watching** with polling for cross-platform compatibility
- **Isolated development environment** with all dependencies
- **Easy setup and teardown** with simple commands

## Quick Start

### 1. Start Development Environment
```bash
# Make the script executable (first time only)
chmod +x docker-dev.sh

# Start the development environment
./docker-dev.sh
```

### 2. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Database**: localhost:5432

### 3. Stop Development Environment
```bash
docker-compose -f docker-compose.dev.yml down
```

## File Structure

```
TutoriAI/
├── docker-compose.dev.yml     # Development Docker Compose configuration
├── Dockerfile.dev             # Frontend development Dockerfile
├── backend/
│   ├── Dockerfile.dev         # Backend development Dockerfile
│   └── .dockerignore          # Backend-specific ignore file
├── .dockerignore              # Global Docker ignore file
└── docker-dev.sh              # Development startup script
```

## Configuration Details

### Frontend Hot Reloading

The frontend is configured with multiple file watching optimizations:

```yaml
environment:
  - CHOKIDAR_USEPOLLING=true      # Enable polling for file changes
  - CHOKIDAR_INTERVAL=1000        # Poll every 1 second
  - WATCHPACK_POLLING=true        # Enable webpack polling
  - FAST_REFRESH=true             # Enable React Fast Refresh
```

**Features:**
- **React Fast Refresh**: Instant updates for React components
- **CSS Hot Reloading**: Styles update without page refresh
- **Asset Hot Reloading**: Images and other assets update automatically

### Backend Hot Reloading

The backend uses nodemon for automatic server restarts:

```yaml
environment:
  - CHOKIDAR_USEPOLLING=true      # Enable polling for file changes
  - WATCHPACK_POLLING=true        # Enable webpack polling
```

**Features:**
- **Automatic Restart**: Server restarts when files change
- **Database Migrations**: Automatic database setup on startup
- **LaTeX Support**: Tectonic compiler included in container

### Volume Mounting

Both services use volume mounting for real-time file synchronization:

```yaml
volumes:
  - ./backend:/app                # Mount backend source code
  - /app/node_modules            # Exclude node_modules from host
  - ./backend/uploads:/app/uploads # Mount uploads directory
```

## Development Workflow

### 1. Making Changes

**Frontend Changes:**
- Edit files in `frontend/src/` directory
- Changes are automatically detected
- Browser refreshes automatically
- React components update without losing state (Fast Refresh)

**Backend Changes:**
- Edit files in `backend/src/` directory
- Server automatically restarts
- API endpoints update immediately
- Database connections are maintained

### 2. Adding Dependencies

**Frontend Dependencies:**
```bash
# Add to package.json, then rebuild
docker-compose -f docker-compose.dev.yml up --build frontend
```

**Backend Dependencies:**
```bash
# Add to backend/package.json, then rebuild
docker-compose -f docker-compose.dev.yml up --build backend
```

### 3. Database Changes

**Schema Changes:**
```bash
# Run Prisma migrations
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
```

**Reset Database:**
```bash
# Reset and seed database
docker-compose -f docker-compose.dev.yml exec backend npm run db:setup
```

## Troubleshooting

### File Changes Not Detected

**Problem**: Changes to files are not triggering hot reloads.

**Solutions:**
1. **Check polling settings**: Ensure `CHOKIDAR_USEPOLLING=true` is set
2. **Increase polling interval**: Set `CHOKIDAR_INTERVAL=2000` for slower systems
3. **Restart containers**: `docker-compose -f docker-compose.dev.yml restart`
4. **Check volume mounts**: Ensure source directories are properly mounted

### Performance Issues

**Problem**: Hot reloading is slow or causes high CPU usage.

**Solutions:**
1. **Exclude unnecessary files**: Update `.dockerignore` files
2. **Reduce polling frequency**: Increase `CHOKIDAR_INTERVAL`
3. **Use native file watching**: Remove polling on Linux/macOS if possible

### Port Conflicts

**Problem**: Ports 3000, 5001, or 5432 are already in use.

**Solutions:**
1. **Stop conflicting services**: `lsof -ti:3000 | xargs kill -9`
2. **Change ports**: Update `docker-compose.dev.yml` port mappings
3. **Use different ports**: Modify environment variables

### Container Build Issues

**Problem**: Containers fail to build or start.

**Solutions:**
1. **Clean build**: `docker-compose -f docker-compose.dev.yml build --no-cache`
2. **Check Docker resources**: Ensure Docker has enough memory/CPU
3. **Update Docker**: Ensure Docker Desktop is up to date

## Advanced Configuration

### Custom File Watching

For specific file types or directories, you can customize the watching behavior:

```yaml
environment:
  - CHOKIDAR_IGNORED=node_modules,dist,build
  - CHOKIDAR_INTERVAL=500
```

### Development vs Production

The development setup is separate from production:

- **Development**: `docker-compose.dev.yml` with hot reloading
- **Production**: `docker-compose.yml` with optimized builds

### Environment Variables

Key environment variables for development:

```bash
# Frontend
REACT_APP_API_URL=http://localhost:5001
CHOKIDAR_USEPOLLING=true
FAST_REFRESH=true

# Backend
NODE_ENV=development
DATABASE_URL=postgresql://tutoriai_user:tutoriai_password@postgres:5432/tutoriai_dev
CHOKIDAR_USEPOLLING=true
```

## Performance Tips

### 1. Optimize File Watching
- Use `.dockerignore` to exclude unnecessary files
- Set appropriate polling intervals
- Exclude `node_modules` from volume mounts

### 2. Resource Management
- Allocate sufficient memory to Docker Desktop
- Use SSD storage for better I/O performance
- Close unnecessary applications

### 3. Development Best Practices
- Make incremental changes to see hot reloading in action
- Use browser dev tools to monitor network requests
- Check container logs for debugging information

## Monitoring and Debugging

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f backend
```

### Container Status
```bash
# Check running containers
docker-compose -f docker-compose.dev.yml ps

# Check resource usage
docker stats
```

### Debug Container
```bash
# Access container shell
docker-compose -f docker-compose.dev.yml exec backend sh
docker-compose -f docker-compose.dev.yml exec frontend sh
```

## Integration with LaTeX

The development environment includes full LaTeX support:

- **Tectonic compiler** installed in backend container
- **Hot reloading** for LaTeX route changes
- **File watching** for LaTeX template updates
- **Real-time compilation** testing

## Next Steps

1. **Start developing**: Use `./docker-dev.sh` to begin
2. **Make changes**: Edit files and see hot reloading in action
3. **Test LaTeX**: Use the task editor to test LaTeX compilation
4. **Monitor performance**: Use logs and stats to optimize

For production deployment, see the main Docker documentation.
