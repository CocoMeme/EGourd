# Plan - Deployment Readiness Audit

## Phase 1: Backend Audit & Enhancement
- [ ] Task: Audit `backend` for hardcoded URLs and migrate to `.env`
- [ ] Task: Implement health check endpoint (`/health`)
- [ ] Task: Audit and configure CORS for production readiness
- [ ] Task: Verify `backend/package.json` scripts and environment variable usage
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Audit & Enhancement' (Protocol in workflow.md)

## Phase 2: Mobile App Audit & Enhancement
- [ ] Task: Audit `frontend/mobile-app` for hardcoded API URLs and migrate to environment configuration
- [ ] Task: Standardize API service configuration to use a single base URL from environment
- [ ] Task: Verify `frontend/mobile-app` build scripts and EAS configuration
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Mobile App Audit & Enhancement' (Protocol in workflow.md)

## Phase 3: Authentication & Security Audit
- [ ] Task: Audit Firebase configuration for production alignment
- [ ] Task: Review Google OAuth client configurations and redirect URIs
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Authentication & Security Audit' (Protocol in workflow.md)

## Phase 4: Final Validation
- [ ] Task: Verify end-to-end communication with local production-like environment settings
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Validation' (Protocol in workflow.md)