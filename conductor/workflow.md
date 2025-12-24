# Project Workflow

## Guiding Principles

1. **The Plan is the Source of Truth:** All work must be tracked in `plan.md`
2. **The Tech Stack is Deliberate:** Changes to the tech stack must be documented in `tech-stack.md` *before* implementation
3. **Optimized Test-Driven Development:** Focus on writing robust tests and implementation together to minimize execution cycles.
4. **High Code Coverage:** Aim for >80% code coverage for all modules
5. **User Experience First:** Every decision should prioritize user experience
6. **Automated Track Commits:** A SINGLE automated commit and push MUST be performed by the agent ONLY after the entire track is completed and archived. No intermediate commits.
7. **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use `CI=true` for watch-mode tools.

## Task Workflow

All tasks follow a high-velocity lifecycle:

### Standard Task Workflow

1. **Select & Batch Tasks:** Choose the next available task from `plan.md`. If the next 2-3 tasks are small and logically related (e.g., creating a model, controller, and route), you may batch them together for a single implementation cycle.

2. **Announce Task(s):** State which task(s) you are beginning. **DO NOT** edit `plan.md` to mark them as "In Progress" `[~]`.

3. **Implementation & Verification (Consolidated):**
   - Create or update the relevant test file.
   - Implement the application code.
   - **Targeted Testing:** Execute *only* the specific test file(s) related to the current tasks (e.g., `node path/to/spec.js`). 
   - Ensure tests pass and verify behavior matches the spec.

4. **Verify Coverage:** Run coverage reports for the specific module being worked on. Target: >80% coverage.

5. **Document Deviations:** If implementation differs from tech stack, update `tech-stack.md` before proceeding.

6. **Stage Code Changes:** Stage all related changes using `git add`.

7. **Update Plan:**
   - **Step 7.1:** Read `plan.md`, find the line(s) for the completed task(s), and update status to `[x]`.
   - **Step 7.2:** Write and stage the modified `plan.md`.

8. **Task Summary:** Provide a very concise summary of the task(s) completed.

### Phase Completion Verification Protocol (Automated)

**Trigger:** Executed immediately after a task/batch completes a phase.

1.  **Full Suite Execution:** Run the **entire** project test suite to ensure no regressions.
2.  **Mark Phase Complete:** Update the phase heading in `plan.md` to `[x]` and stage it.
3.  **Summary:** Inform the user the phase is complete and verified. Proceed to the next phase immediately.

### Track Completion & Finalization Protocol

**Trigger:** Executed after all phases/tasks in `plan.md` are marked complete.

1.  **Archive Track:** 
    - Move the track's folder from `conductor/tracks/<track_id>` to `conductor/archive/<track_id>`.
    - Update `conductor/tracks.md` to mark the track as `[x] Completed` and update its link to the archive location.
    - Stage the file moves and updates (`git add .`).

2.  **Automated Commit & Push:** 
    - Generate a conventional commit message (e.g., `feat: [Track Name] implementation`).
    - Run `git commit -m "..."` and `git push`.
