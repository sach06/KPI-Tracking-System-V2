# KPI Tracking System V2

Professional KPI Tracking System with specialized views for Operational and Technical KPIs.

## 🚀 Overview
This project consists of:
- **Frontend**: A modern React + Vite application (in `/kpi-app`).
- **Backend**: A Node.js Express server connected to SQL Server (in `/kpi-app-backend`).
- **Containerization**: Fully Dockerized with `docker-compose`.
- **CI/CD**: Azure Pipelines configuration included for automated builds.

## 🛠 Tech Stack
- **Frontend**: React, CSS, Vite, Axios.
- **Backend**: Node.js, Express, mssql (Tedious).
- **Database**: SQL Server.
- **Infrastructure**: Docker, Nginx (for Frontend).

## 🐳 Running with Docker
To run the entire stack:
```bash
docker-compose up -d --build
```
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3001`

## ☁️ Deployment
The project is configured for Azure DevOps pipelines.
1. Configure a Docker Registry Service Connection in Azure DevOps.
2. Update the `azure-pipelines.yml` with your registry details.
3. Build and Push images to Azure Container Registry.
