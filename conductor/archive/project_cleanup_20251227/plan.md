# Plan: Project Cleanup & Documentation Refactor

This plan outlines the steps to clean up the project documentation, configuration, and codebase.

## Phase 1: Configuration & Documentation Cleanup
- [x] Task: Merge `backend/.gitignore` into the root `.gitignore` and delete the backend specific file.
- [x] Task: Audit the `/docs` directory. List all files to be deleted (excluding `/docs/training_model`).
- [x] Task: Delete the identified outdated files in `/docs`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Configuration & Documentation Cleanup' (Protocol in workflow.md)

## Phase 2: Asset & Code Cleanup
- [x] Task: Audit the codebase for unused images and static assets. Remove confirmed unused files.
- [x] Task: Audit the codebase for unused imports, dead code, and commented-out blocks. Remove them.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Asset & Code Cleanup' (Protocol in workflow.md)

## Phase 3: Standardization & Verification
- [x] Task: Check file naming conventions against the existing pattern (PascalCase for Components, camelCase for logic). Rename files that violate this.
- [x] Task: Run project linting tools (if available) or manually check for formatting inconsistencies. Fix identified issues.
- [x] Task: Run the build process for both backend and frontend to ensure no broken references.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Standardization & Verification' (Protocol in workflow.md)
