# Specification: Documentation Overhaul (Main README & Developer Guide)

## 1. Overview
The goal of this track is to update the project's root documentation to accurately reflect the current state of the "Thesis" project (JW Notes). We will separate the content into a high-level, product-focused `README.md` and a technical, developer-focused `README_DEV.md`.

## 2. Functional Requirements
### 2.1 Main README.md Update
- **Project Description**: Provide a concise and professional summary of the JW Notes application.
- **Key Features**: List the core features (Mapping, Time Tracking, Offline-first Sync, etc.) in a clear **table format** for easy reading.
- **Tech Stack**: Summarize the technologies used (React Native/Expo, Node.js, Zustand, etc.).
- **Installation (Basic)**: Include a high-level "Quick Start" section with the primary setup commands.
- **Developer Documentation Link**: Explicitly link to the `README_DEV.md` for detailed setup instructions.
- **Formatting**: Ensure the content is concise, clear, and **free of emojis**.

### 2.2 README_DEV.md Creation
- **Rename**: Rename the existing `set-up_instruction.md` to `README_DEV.md`.
- **Refinement**: Ensure the installation commands and environment setup steps are accurate and easy to follow for a new developer.

## 3. Acceptance Criteria
- [ ] `README.md` is updated with a project overview, a features table, and tech stack summary.
- [ ] `README.md` does not contain any emojis.
- [ ] `README_DEV.md` exists in the root directory.
- [ ] `set-up_instruction.md` has been removed.
- [ ] `README.md` contains a clear link to `README_DEV.md`.
- [ ] All installation commands are verified against `set-up_instruction.md`.

## 4. Out of Scope
- Creating user manuals or help guides beyond basic usage.
- Updating documentation inside subdirectories (backend/frontend) unless directly related to the root READMEs.
