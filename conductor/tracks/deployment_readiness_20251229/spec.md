# Specification - Deployment Readiness Audit (Backend & Mobile)

## Overview
This track focuses on auditing and preparing the `backend` and `mobile-app` for deployment on Render (Backend) and EAS (Mobile). The primary goal is to eliminate hardcoded configurations, standardize API URLs, and ensure all environment-specific settings are correctly externalized and ready for production.

## Functional Requirements
- **URL Audit & Externalization**:
    - Identify all hardcoded API URLs in the `mobile-app` and `backend`.
    - Migrate these URLs to `.env` files and access them via environment variables.
    - Resolve any inconsistent or duplicate URL definitions across the codebase.
- **Backend Readiness**:
    - Implement a `/health` endpoint in the backend to support Render's health monitoring.
    - Audit and configure CORS middleware to support production domains.
    - Verify `package.json` scripts (`start`, `build`) are optimized for Render deployment.
- **Authentication Audit**:
    - Verify Firebase production configuration (API keys, project IDs).
    - Review Google OAuth redirect URIs and Client IDs for production alignment.

## Non-Functional Requirements
- **Security**: No sensitive credentials or production URLs should be committed to version control.
- **Reliability**: Ensure the health check accurately reflects the system's operational state (e.g., database connection status).

## Acceptance Criteria
- [ ] No hardcoded API URLs remain in the `mobile-app` or `backend` source code.
- [ ] Backend responds with `200 OK` on a `/health` endpoint.
- [ ] `mobile-app` can successfully communicate with the backend using an environment-defined base URL.
- [ ] CORS settings are documented and ready for production domain white-listing.
- [ ] `package.json` scripts are verified to work in a clean install environment.

## Out of Scope
- Actually performing the deployment (this is an audit and preparation track).
- Infrastructure setup on Render or EAS (e.g., creating the projects in their respective dashboards).