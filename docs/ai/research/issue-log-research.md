# Executive Recommendation

Adopt a **structured YAML register** stored in a single file (or a few files by area) with a well-defined schema. YAML is a human-readable data serialization format[[1]](https://en.wikipedia.org/wiki/YAML#:~:text=YAML%20,4) that supports inline comments[[2]](https://medium.com/better-programming/yaml-vs-json-which-is-more-efficient-for-language-models-5bc11dd0f6df#:~:text=Appendix), making it ideal for both human and agent consumers. For example, each issue entry should have fields like ID, Title, Category, Severity, Priority, Confidence, Scope, Observed, Expected, TraceLink (e.g. commit hash or prompt URL), Status, NextAction, and an append-only History log. Use a **time-based ULID** (or UUIDv7) for the ID to guarantee uniqueness and sortability[[3]](https://byteaether.github.io/2025/uuid-vs-ulid-vs-integer-ids-a-technical-guide-for-modern-systems/#:~:text=ULIDs%20are%20128,indexing%20patterns%20to%20minimize%20fragmentation)[[4]](https://rightx.ltd/2025/10/23/beyond-the-vibe-orchestrating-ai-for-sustainable-codingda/#:~:text=TODO%20lists%20in%20markdown%2C%20the,log%2C%20even%20multiple%20AI%20agents) (e.g. AI-ISSUE-01F3KX...). **Minimal required fields** include Observed, Expected, TraceLink, and initial Status/NextAction – others (like detailed Priority or Confidence) can be optional to reduce capture friction. Follow an **append-only update rule**: never rewrite or delete past entries, only add new timestamped notes to the History array[[5]](https://www.ais.com/practical-memory-patterns-for-reliable-longer-horizon-agent-workflows/#:~:text=Lifespan%3A%20Months%20to%20years%2C%20based,and%20audit%20or%20compliance%20needs). This preserves auditability and prevents conflicts. Altogether, this single-file YAML register with stable IDs and append-only logs meets the criteria: low capture friction, easy parsing by agents, and full traceability.

* **Format:** YAML single registry (editable in any repo) for all issues. YAML is concise and human-friendly[[1]](https://en.wikipedia.org/wiki/YAML#:~:text=YAML%20,4), and unlike JSON it even supports comments[[2]](https://medium.com/better-programming/yaml-vs-json-which-is-more-efficient-for-language-models-5bc11dd0f6df#:~:text=Appendix).
* **ID Scheme:** Use lexicographically sortable, time-based ULIDs for unique issue IDs[[3]](https://byteaether.github.io/2025/uuid-vs-ulid-vs-integer-ids-a-technical-guide-for-modern-systems/#:~:text=ULIDs%20are%20128,indexing%20patterns%20to%20minimize%20fragmentation). This avoids collisions in offline/multi-agent scenarios (similar to Yegge’s “Beads” tracker that used unique IDs and links[[4]](https://rightx.ltd/2025/10/23/beyond-the-vibe-orchestrating-ai-for-sustainable-codingda/#:~:text=TODO%20lists%20in%20markdown%2C%20the,log%2C%20even%20multiple%20AI%20agents)).
* **Core Fields:** Require Observed and Expected descriptions for each issue[[6]](https://cursa.app/en/page/writing-clear-bug-reports-with-reproducible-steps#:~:text=2,results), plus a TraceLink (commit or prompt link[[7]](https://cursa.app/en/page/writing-clear-bug-reports-with-reproducible-steps#:~:text=Many%20issues%20depend%20on%20where,enough%20environment%20detail%20to%20reproduce)) and Status. Capture minimal context so agent capture is quick.
* **Append-Only History:** Each entry has a History log: agents always append a new timestamped note when updating status or adding info. Do **not** overwrite earlier content[[5]](https://www.ais.com/practical-memory-patterns-for-reliable-longer-horizon-agent-workflows/#:~:text=Lifespan%3A%20Months%20to%20years%2C%20based,and%20audit%20or%20compliance%20needs); this provides an audit trail.

# Comparison of Candidate Formats

* **YAML (single file)** – A single YAML file (ai-feedback-register.yaml) listing all issues. Easy to parse and diff sequentially, but can incur merge conflicts if many agents edit concurrently. YAML’s whitespace-based structure is human-readable[[1]](https://en.wikipedia.org/wiki/YAML#:~:text=YAML%20,4) and supports comments[[2]](https://medium.com/better-programming/yaml-vs-json-which-is-more-efficient-for-language-models-5bc11dd0f6df#:~:text=Appendix), making it well-suited for a registry.
* **YAML (multiple files)** – A folder of one-issue-per-file (ai\_feedback/AI-ISSUE-\*.yaml). This spreads load: each agent can create/update its own file, greatly reducing merge conflicts. It is also fully machine-readable. However, it scatters data (harder to scan at a glance) and requires a file-per-issue convention. Searching can still be done via text search.
* **Markdown (with YAML frontmatter)** – A Markdown “issue card” for each entry (or a table) combines human-readability with structured data. This is very user-friendly, but parsing is more complex (agents must strip frontmatter). It also risks stray edits outside metadata. If used, store one issue per MD file.
* **JSON** (less ideal) – JSON would be equally parseable and enforce strict schema, but it lacks comment support and is more verbose[[1]](https://en.wikipedia.org/wiki/YAML#:~:text=YAML%20,4)[[8]](https://en.wikipedia.org/wiki/JSON#:~:text=d%CA%92%20e%C9%AA%20%CB%8C%20s%20%C9%92,of%20%20133%20with%20servers). Agents can use it, but JSON’s rigid syntax makes it error-prone for hand edits.

In summary, **YAML** is recommended over JSON for its readability and comments[[1]](https://en.wikipedia.org/wiki/YAML#:~:text=YAML%20,4)[[2]](https://medium.com/better-programming/yaml-vs-json-which-is-more-efficient-for-language-models-5bc11dd0f6df#:~:text=Appendix). Between single-file and multi-file, the choice depends on team size: one file is easiest for centralized tracking, while multiple files greatly reduce merge conflicts. (The register format should allow either as a configurable policy.) Markdown-based formats are less agent-friendly, so they are not preferred unless maximum human legibility is needed.

# Proposed Taxonomy

Define standardized fields and categories so issues are consistent and measurable. Key schema fields include: - **Category:** One of (e.g.) *Bug* (logic error), *Hallucination* (factual error), *Omission* (missing requirement), *Ambiguity* (spec unclear), *Style/UX* (presentation issue), *Safety/Security*, *Performance*, *Tool/Integration*, etc. (These should be tailored to the project’s domain.) Consider adopting a “living taxonomy” of AI error types[[9]](https://testfort.com/blog/ai-hallucination-testing-guide#:~:text=Systematize%20your%20findings,fixes%20and%20prevents%20recurring%20issues) so recurring issues can be classified and tracked.
- **Severity & Priority:** Severity (how **bad** the issue is) vs Priority (how quickly to fix)[[10]](https://community.atlassian.com/forums/Jira-questions/Severity-vs-Priority/qaq-p/965968#:~:text=There%27s%20a%20historical%20essay%20to,just%20add%20a%20custom%20field). For example, use levels like Critical, High, Medium, Low for severity. Priority (P1/P2/P3) can be calculated from severity and impact.
- **Confidence:** (Optional) Reporter’s confidence level (e.g. High/Medium/Low) that the issue is valid. This helps triage ambiguous cases.
- **Scope:** Indicate if the issue is *local* (one prompt or module) or *systemic* (affects multiple prompts/files).
- **Traceability:** Link to the source context – a prompt transcript ID, file path, commit hash, or log reference. For instance, include the related commit hash and environment as recommended in bug reports[[7]](https://cursa.app/en/page/writing-clear-bug-reports-with-reproducible-steps#:~:text=Many%20issues%20depend%20on%20where,enough%20environment%20detail%20to%20reproduce).
- **Reproduction:** Steps or conditions to reproduce (similar to QA bug reports). At minimum separate the **Observed** behavior from the **Expected** behavior (a best practice in bug reports[[6]](https://cursa.app/en/page/writing-clear-bug-reports-with-reproducible-steps#:~:text=2,results)). Always capture *what was seen* vs *what should have happened*.
- **History:** An append-only array of timestamped notes/events (updates to status, investigations, etc.). This prevents losing past context[[5]](https://www.ais.com/practical-memory-patterns-for-reliable-longer-horizon-agent-workflows/#:~:text=Lifespan%3A%20Months%20to%20years%2C%20based,and%20audit%20or%20compliance%20needs).

By enforcing these fields in every issue, the register remains queryable and actionable. For example, one could filter all “Hallucination, High severity” issues, or see the timeline of an item via its history log. This structure turns vague feedback into clear action items: *“Observed: [AI output], Expected: [ground truth]”*, along with references and status.

# Proposed Schema (YAML)

# Example YAML schema for ai-feedback-register.yaml
- id: AI-ISSUE-01F3KX5J7M # Unique ID (ULID or timestamp+counter)
 title: "API endpoint returns incorrect sum"
 category: Bug # e.g. Bug, Hallucination, Omission, etc.
 severity: High # Critical, High, Medium, Low
 priority: 2 # P1/P2/P3 or numeric priority
 confidence: High # Optional: reporter's confidence
 scope: Local # Local (single prompt/file) or Systemic
 observed: "The generated /add endpoint returns 10 when inputs 3 and 4 are provided."
 expected: "The endpoint should return 7 for inputs 3 and 4."
 trace\_link: "commit/abc1234" # e.g. link to code or prompt log
 status: Open # Open, InProgress, Closed, Won't Fix, Duplicate, etc.
 next\_action: "Investigate calculation logic in codegen module"
 history:
 - timestamp: 2025-01-25T14:00:00Z
 note: "Issue created by agent after test failed"
 - timestamp: 2025-01-25T15:30:00Z
 note: "Assigned to developer Jane Doe"
 # ... more log entries ...

*(This YAML defines each issue as a map. A YAML list (-) holds all issues. Agents must follow this structure.)*

# Examples

Below are several realistic issue entries (YAML format) across different categories:

- id: AI-ISSUE-01F3KX5J7M
 title: "API endpoint returns incorrect sum"
 category: Bug
 severity: High
 priority: 2
 confidence: High
 scope: Local
 observed: "POST /add with {x:3, y:4} returned {sum:10}."
 expected: "It should return {sum:7}."
 trace\_link: "commit/abc1234"
 status: Open
 next\_action: "Review code generation logic for addition."
 history:
 - timestamp: 2025-01-25T14:00:00Z
 note: "Issue created by codegen agent."
- id: AI-ISSUE-01F3KY0ZB8
 title: "Missing input validation on /login endpoint"
 category: Omission
 severity: Medium
 priority: 3
 confidence: Medium
 scope: Systemic
 observed: "No code to sanitize user input in the generated login function."
 expected: "Login function should escape inputs to prevent SQL injection."
 trace\_link: "prompt/weekly-iteration.md#session3"
 status: InProgress
 next\_action: "Add input validation middleware."
 history:
 - timestamp: 2025-01-24T09:15:00Z
 note: "Captured during interactive dev session."
- id: AI-ISSUE-01F3KZ1C6T
 title: "Answer contains factual hallucination about company revenue"
 category: Hallucination
 severity: Critical
 priority: 1
 confidence: High
 scope: Local
 observed: "AI stated that Company X had 200% revenue growth last quarter."
 expected: "Correct data is 20% growth as per financial report."
 trace\_link: "transcript/qa-chat-2025-01-23.txt"
 status: Open
 next\_action: "Flag for immediate correction; update knowledge base."
 history:
 - timestamp: 2025-01-23T18:45:00Z
 note: "User reported factual error in interactive session."
- id: AI-ISSUE-01F3L2AB9P
 title: "Inconsistent coding style: missing docstrings"
 category: Style
 severity: Low
 priority: 5
 confidence: High
 scope: Local
 observed: "Generated Python functions lack docstrings as per project style guide."
 expected: "Public functions should include descriptive docstrings."
 trace\_link: "commit/abc1245"
 status: Open
 next\_action: "Add docstrings in code generation templates."
 history:
 - timestamp: 2025-01-22T11:30:00Z
 note: "Code reviewer noted missing docstrings."
- id: AI-ISSUE-01F3L3GH7W
 title: "Refactoring needed: duplicated business logic across modules"
 category: Maintenance
 severity: Medium
 priority: 3
 confidence: Medium
 scope: Systemic
 observed: "Both `billing.py` and `invoice.py` contain identical tax calculation code."
 expected: "Extract shared logic into a common module or function."
 trace\_link: "diff/ feature-branch#L120-L130"
 status: Open
 next\_action: "Refactor with utility module for tax calculations."
 history:
 - timestamp: 2025-01-21T16:20:00Z
 note: "Detected during code audit by AI."

# Agent Operating Rules

* **Append-only logging:** Agents **must not** overwrite or delete any existing fields or history. Every change (status update, reassignment, note) is appended as a new history entry. This follows the episodic “write-once event log” pattern[[5]](https://www.ais.com/practical-memory-patterns-for-reliable-longer-horizon-agent-workflows/#:~:text=Lifespan%3A%20Months%20to%20years%2C%20based,and%20audit%20or%20compliance%20needs).
* **Preserve IDs:** Once an issue ID is assigned, it must never change. The agent should never rename or duplicate IDs.
* **Timestamped entries:** All history notes must include an ISO timestamp. Agents should append a structured log entry, e.g. {"timestamp": "...", "note": "..."}, whenever they update an issue.
* **Minimal diffs:** When updating, only add or edit necessary lines. Do not reorder fields or format the file differently – this keeps diffs clean and merge conflicts minimal.
* **No invented facts:** The agent should avoid guessing missing information. If crucial details (e.g. the exact expected behavior) are unclear, it should prompt for clarification instead of inventing data.
* **Link to evidence:** Agents should populate TraceLink with the actual source of the issue (commit, prompt ID, or log reference) whenever possible, rather than vague descriptions.

# Triage + Phase Gate Workflow

1. **Capture:** During an AI session or review, any issue found is logged immediately (30–60s) into the register by the agent or user. Use the minimal schema to note Observed/Expected and a link.
2. **Triage (weekly):** A designated lead or rotation team reviews new issues each week. They categorize, set severity/priority, merge duplicates, and assign owners or deadlines. Issues can be reordered or broken into new items during triage, but original history must be preserved.
3. **Plan & Fix:** Schedule fixes in upcoming sprints or dedicated cleanup phases. Enforce “phase gates”: for example, before a release milestone there should be *no open Severity=Critical* issues and at most N Severity=High issues. Low-severity items can be deferred if needed.
4. **Verify:** When a fix or improvement is made (by agent or human), the reviewer marks the issue **Closed** only after evidence of resolution (e.g. new test results or updated docs) is logged. The history should note the fix details.
5. **Close:** Confirm the issue is resolved to the reporter’s satisfaction, then close it with a final history entry. If an issue is deemed invalid or “won’t fix,” log the reason in history and close with that status.

**Metrics & Continuous Improvement:** Regularly generate reports from the register. Track recurring categories (e.g. top 5 issue types[[11]](https://testfort.com/blog/ai-hallucination-testing-guide#:~:text=Systematize%20your%20findings,fixes%20and%20prevents%20recurring%20issues)) and average time-to-close by severity. Monitor ratios like “Agent Misinterpretation” vs “Spec Ambiguity” to identify process gaps. Use this data in retrospectives to reduce future issues.

# Automation / Validation Suggestions

* **Schema Linting:** Implement a YAML linter or JSON Schema validator to enforce required fields and formats on every commit (e.g. via pre-commit). This catches malformed entries early.
* **Issue Dashboard Generator:** Write a script to render a human-friendly dashboard (e.g. static HTML or Markdown) of all open issues by category/severity. This can be auto-updated or published for stakeholders.
* **Git Hooks:** Use a pre-commit hook to ensure any change to the register follows rules (e.g. no deleted entries, ID format, timestamp format). Reject commits that break schema.
* **Phase-Gate Report Script:** Automate calculation of “quality gate” metrics before each sprint or release (e.g. count of Critical/High issues). Fail the build or alert the team if thresholds are exceeded.
* **Duplicate Detection:** Optionally, a simple NLP check can flag potentially duplicate issues during triage (e.g. similar Observed text).

# Rollout Plan (2–4 weeks)

* **Week 1 (Design & Training):** Finalize the schema and conventions (ID format, category list). Integrate the register file into the repo. Hold a short training/demo for the team on how to log issues quickly.
* **Week 2 (Pilot in Sprint):** Use the register in a normal sprint for all AI-related work (documenting any feedback/issues). Adjust format as needed based on real feedback. Automate lint checks and an “open issues” report.
* **Week 3 (Refine & Automate):** Refine categories/fields from pilot lessons. Implement pre-commit schema validation and generate a dashboard. Update SOPs or templates (for agents and humans).
* **Week 4 (Embed in Process):** Enforce phase gates for the next release planning (e.g. no open critical issues). Audit usage: ensure issues are being logged and closed properly. Gather metrics (issue counts, fix times) to measure impact. Continue iterating until the register is a natural part of the workflow.

By following these recommendations, teams can rapidly capture AI feedback in a lightweight yet structured way, avoid forgotten issues, and gradually clear backlogs in controlled phases, all while enabling both human and agent participants to collaborate seamlessly. The result will be measurable quality improvements and a documented history of AI-driven development.

**Sources:** Practices and examples drawn from software engineering best practices and recent AI agent development literature[[5]](https://www.ais.com/practical-memory-patterns-for-reliable-longer-horizon-agent-workflows/#:~:text=Lifespan%3A%20Months%20to%20years%2C%20based,and%20audit%20or%20compliance%20needs)[[4]](https://rightx.ltd/2025/10/23/beyond-the-vibe-orchestrating-ai-for-sustainable-codingda/#:~:text=TODO%20lists%20in%20markdown%2C%20the,log%2C%20even%20multiple%20AI%20agents)[[6]](https://cursa.app/en/page/writing-clear-bug-reports-with-reproducible-steps#:~:text=2,results)[[10]](https://community.atlassian.com/forums/Jira-questions/Severity-vs-Priority/qaq-p/965968#:~:text=There%27s%20a%20historical%20essay%20to,just%20add%20a%20custom%20field).

[[1]](https://en.wikipedia.org/wiki/YAML#:~:text=YAML%20,4) YAML - Wikipedia

<https://en.wikipedia.org/wiki/YAML>

[[2]](https://medium.com/better-programming/yaml-vs-json-which-is-more-efficient-for-language-models-5bc11dd0f6df#:~:text=Appendix) YAML vs. JSON: Which Is More Efficient for Language Models? | by Elya Livshitz | Better Programming

<https://medium.com/better-programming/yaml-vs-json-which-is-more-efficient-for-language-models-5bc11dd0f6df>

[[3]](https://byteaether.github.io/2025/uuid-vs-ulid-vs-integer-ids-a-technical-guide-for-modern-systems/#:~:text=ULIDs%20are%20128,indexing%20patterns%20to%20minimize%20fragmentation) UUID vs ULID vs Integer IDs: A Technical Guide for Modern Systems | ByteAether

<https://byteaether.github.io/2025/uuid-vs-ulid-vs-integer-ids-a-technical-guide-for-modern-systems/>

[[4]](https://rightx.ltd/2025/10/23/beyond-the-vibe-orchestrating-ai-for-sustainable-codingda/#:~:text=TODO%20lists%20in%20markdown%2C%20the,log%2C%20even%20multiple%20AI%20agents) Beyond the Vibe: Orchestrating AI for Sustainable Coding - right x

<https://rightx.ltd/2025/10/23/beyond-the-vibe-orchestrating-ai-for-sustainable-codingda/>

[[5]](https://www.ais.com/practical-memory-patterns-for-reliable-longer-horizon-agent-workflows/#:~:text=Lifespan%3A%20Months%20to%20years%2C%20based,and%20audit%20or%20compliance%20needs) Practical Memory Patterns for Reliable, Longer-Horizon Agent Workflows - Applied Information Sciences

<https://www.ais.com/practical-memory-patterns-for-reliable-longer-horizon-agent-workflows/>

[[6]](https://cursa.app/en/page/writing-clear-bug-reports-with-reproducible-steps#:~:text=2,results) [[7]](https://cursa.app/en/page/writing-clear-bug-reports-with-reproducible-steps#:~:text=Many%20issues%20depend%20on%20where,enough%20environment%20detail%20to%20reproduce) Writing Clear Bug Reports with Reproducible Steps : Course Software Testing Foundations: From Requirements to Defects | Cursa

<https://cursa.app/en/page/writing-clear-bug-reports-with-reproducible-steps>

[[8]](https://en.wikipedia.org/wiki/JSON#:~:text=d%CA%92%20e%C9%AA%20%CB%8C%20s%20%C9%92,of%20%20133%20with%20servers) JSON - Wikipedia

<https://en.wikipedia.org/wiki/JSON>

[[9]](https://testfort.com/blog/ai-hallucination-testing-guide#:~:text=Systematize%20your%20findings,fixes%20and%20prevents%20recurring%20issues) [[11]](https://testfort.com/blog/ai-hallucination-testing-guide#:~:text=Systematize%20your%20findings,fixes%20and%20prevents%20recurring%20issues) AI Hallucinations Testing | Test for LLM, RAG Hallucination

<https://testfort.com/blog/ai-hallucination-testing-guide>

[[10]](https://community.atlassian.com/forums/Jira-questions/Severity-vs-Priority/qaq-p/965968#:~:text=There%27s%20a%20historical%20essay%20to,just%20add%20a%20custom%20field) Severity vs. Priority

<https://community.atlassian.com/forums/Jira-questions/Severity-vs-Priority/qaq-p/965968>