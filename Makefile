## TutoriAI convenience Makefile
## Usage:
##   make up ENV=dev     # start dev containers
##   make down ENV=prod  # stop prod containers

.PHONY: clean build up down

ENV ?= dev

ifeq ($(ENV),dev)
	COMPOSE_FILE := docker-compose.dev.yml
else
	COMPOSE_FILE := docker-compose.yml
endif

# Prefer modern `docker compose`, but fall back to `docker-compose` if needed.
DOCKER_COMPOSE ?= $(shell command -v docker-compose >/dev/null 2>&1 && echo docker-compose || echo "docker compose")

up:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) up -d

down:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) down --remove-orphans

build:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) build --no-cache

clean:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) down -v --remove-orphans

