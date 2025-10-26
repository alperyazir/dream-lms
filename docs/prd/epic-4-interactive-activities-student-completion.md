# Epic 4: Interactive Activities & Student Completion

**Epic Goal:**

Build complete interactive activity player components in React for all five activity types (drag-and-drop, word matching, multiple-choice, 
true/false, word search) that parse activity configurations from Dream Central Storage and provide engaging, accessible user experiences. Enable 
students to complete assignments, with automatic score calculation, progress tracking, and result submission to the backend. Implement activity 
state persistence so students can pause and resume work. By the end of this epic, students can complete their assigned homework, see their scores
 immediately, and teachers can view completion status (detailed analytics in Epic 4).

## Story 4.1: Activity Player Framework & Layout

As a **student**,  
I want **a consistent activity player interface that loads any activity type and provides navigation controls**,  
so that **I have a familiar experience regardless of which activity I'm completing**.

### Acceptance Criteria:

1. Clicking "Start Assignment" from student assignment detail page navigates to `/assignments/{assignment_id}/play`
2. Activity player page includes header showing: assignment name, book title, activity type badge, timer (if time limit set), progress indicator
(question X of Y for multi-part activities)
3. API endpoint `GET /api/assignments/{assignment_id}/start` marks assignment as "in_progress" and returns full activity config and content
4. Frontend fetches activity configuration (config.json data) and media assets from Dream Central Storage via backend proxy
5. Activity player includes main content area for activity-specific rendering
6. Footer includes action buttons: "Submit" (disabled until activity completion criteria met), "Save Progress" (for later stories), "Exit" (with 
unsaved changes warning)
7. Timer counts down if time_limit_minutes is set, showing warning at 5 minutes remaining
8. If timer reaches zero, activity auto-submits current state
9. Activity player implements responsive layout optimized for tablets and desktops (primary devices for interactive activities)
10. Loading state displays while fetching activity data from Dream Central Storage
11. Error state handles scenarios: activity not found, Dream Central Storage unavailable, student already completed assignment
12. Unit tests verify activity data fetching and error handling
13. Integration tests verify navigation and initial load workflow

## Story 4.2: Multiple Choice Activity Player

As a **student**,  
I want **to answer multiple-choice questions with immediate visual feedback**,  
so that **I can complete multiple-choice assignments**.

### Acceptance Criteria:

1. Multiple choice player parses config.json structure for question text, options, correct answer(s), and media (images/audio if present)
2. Each question displays: question text, numbered options (radio buttons for single-select, checkboxes for multi-select), optional image/media 
above question
3. Student can select one or more answers depending on question type (single vs. multi-select)
4. "Next" button advances to next question, "Previous" button returns to previous question
5. Progress indicator shows current question number out of total (e.g., "Question 3 of 10")
6. Visual indicator shows which questions have been answered (e.g., green checkmark on progress dots)
7. "Submit" button becomes enabled when all questions have at least one answer selected
8. On submit, frontend calculates score: (correct answers / total questions) × 100
9. Results screen displays: total score percentage, breakdown of correct/incorrect answers, option to review answers with correct/incorrect 
indicators
10. Answer review shows: student's selection (marked), correct answer (highlighted in green), incorrect answers (highlighted in red)
11. Component handles edge cases: no options provided, missing question text, invalid config structure (graceful error display)
12. Unit tests verify score calculation for various answer patterns
13. Accessibility: keyboard navigation between questions, screen reader announcements for question changes

## Story 4.3: True/False Activity Player

As a **student**,  
I want **to answer true/false questions with a simple, clear interface**,  
so that **I can quickly complete true/false assignments**.

### Acceptance Criteria:

1. True/False player parses config.json structure for statement text, correct answer (true/false), and optional explanation
2. Each question displays: statement text, two large buttons labeled "True" and "False", optional media (image/audio)
3. Student clicks True or False button to select answer (selected button highlights)
4. Student can change answer before moving to next question
5. "Next" button advances to next statement, "Previous" button returns
6. Progress indicator shows current statement number out of total
7. Visual feedback shows which statements have been answered
8. "Submit" button becomes enabled when all statements have been answered
9. Score calculation: (correct answers / total statements) × 100
10. Results screen shows score and statement-by-statement review with student answer, correct answer, and optional explanation if provided in 
config
11. Component handles rapid clicking (debounce) to prevent accidental double-selection
12. Mobile-optimized: large touch targets for True/False buttons
13. Unit tests verify score calculation and answer state management
14. Accessibility: keyboard support (T for True, F for False, arrow keys for navigation)

## Story 4.4: Word Matching Activity Player

As a **student**,  
I want **to match words or phrases by dragging and dropping or clicking pairs**,  
so that **I can complete word matching assignments**.

### Acceptance Criteria:

1. Word matching player parses config.json structure for pairs (term/definition or word/translation)
2. Activity displays two columns: left column with terms/words, right column with definitions/translations (randomized order)
3. **Desktop interaction**: Student drags item from left column and drops onto matching item in right column
4. **Mobile/touch interaction**: Student taps item in left column (highlights it), then taps matching item in right column to create pair
5. When correct match is made, both items highlight green and lock in place
6. When incorrect match is attempted, both items flash red and reset
7. Visual feedback shows which items are already matched (disabled/grayed out)
8. Student can unmatch pairs by clicking "Unmatch" button next to matched pair
9. "Submit" button becomes enabled when all items are matched
10. Score calculation: (correct matches / total pairs) × 100 (no partial credit for incorrect attempts)
11. Results screen shows final score and review of all correct pairs
12. Component handles edge cases: odd number of items, duplicate terms
13. Drag-and-drop implements proper touch event handling for tablets
14. Unit tests verify matching logic and score calculation
15. Accessibility: keyboard navigation with arrow keys, Enter to select/match, Esc to unmatch

## Story 4.5: Fill-in-the-Blank (Drag-and-Drop) Activity Player

As a **student**,  
I want **to complete sentences by dragging words into blank spaces**,  
so that **I can complete fill-in-the-blank assignments**.

### Acceptance Criteria:

1. Fill-in-the-blank player parses config.json structure for sentences with blank markers and word bank
2. Activity displays: sentence(s) with blank drop zones (represented as underlined spaces or boxes), word bank at bottom/side with available 
words
3. **Desktop interaction**: Student drags word from word bank and drops into blank space
4. **Mobile/touch interaction**: Student taps word in word bank (highlights), then taps blank space to place word
5. Placed words can be removed by dragging back to word bank or clicking "Remove" icon on the word
6. Word bank visually indicates which words have been used (grayed out or removed from bank depending on config - single use vs. reusable words)
7. Multiple blank sentences display sequentially or all at once depending on config
8. "Submit" button becomes enabled when all blanks are filled
9. Score calculation: (correct placements / total blanks) × 100
10. Results screen shows completed sentences with correct answers highlighted in green, incorrect in red, and shows correct answer below
11. Component handles edge cases: more words than blanks, fewer words than blanks (requires partial answers)
12. Drag-and-drop supports touch gestures on tablets
13. Unit tests verify placement logic and score calculation
14. Accessibility: keyboard navigation to select words and blanks, Enter to place, Backspace to remove

## Story 4.6: Word Search Activity Player

As a **student**,  
I want **to find and select words in a letter grid**,  
so that **I can complete word search assignments**.

### Acceptance Criteria:

1. Word search player parses config.json structure for grid dimensions, letter grid, and target words list
2. Activity displays: letter grid (table/grid layout), list of target words to find (with checkboxes or strikethrough when found)
3. **Desktop interaction**: Student clicks first letter, drags to last letter, releases to select word
4. **Mobile/touch interaction**: Student taps first letter, taps last letter to select word (or swipes)
5. When correct word is selected, letters highlight in color (different color per word) and word is marked as found
6. When incorrect selection is made, selection clears with no penalty
7. Student can deselect found word by clicking it again (removes highlight)
8. Words can be oriented: horizontal, vertical, diagonal (all directions as defined in config)
9. Progress indicator shows: "Found X of Y words"
10. "Submit" button becomes enabled when all words are found (or allow partial submission with penalty)
11. Optional hint system: clicking hint button highlights first letter of an unfound word (1 hint per word)
12. Score calculation: (words found / total words) × 100
13. Results screen shows grid with all words highlighted and list of found/missed words
14. Timer integration: word search often has time limits, integrate with activity player timer
15. Unit tests verify word selection logic and found word detection
16. Accessibility: keyboard navigation to traverse grid, spacebar to start/end selection

## Story 4.7: Assignment Submission & Result Storage

As a **student**,  
I want **my completed activity automatically saved with my score and answers**,  
so that **my teacher can see that I finished my work and my grade is recorded**.

### Acceptance Criteria:

1. When student clicks "Submit" on activity player, frontend sends completion data to backend
2. API endpoint `POST /api/assignments/{assignment_id}/submit` accepts payload: answers_json (all student responses), score (calculated 
frontend), time_spent_minutes, completed_at timestamp
3. Backend validates: assignment belongs to student, assignment is not already completed, score is between 0-100
4. Backend updates AssignmentStudent record: status="completed", score, completed_at, time_spent_minutes, answers_json (JSONB field)
5. Backend stores complete answer data for teacher review (detailed view in Epic 4)
6. API returns success response with completion summary
7. Frontend displays success screen: "Assignment completed! Your score: X%" with confetti animation or positive visual feedback
8. Success screen includes buttons: "View Results" (shows answer review), "Back to Dashboard"
9. After submission, student cannot retake assignment (assignment detail page shows "Completed" with score, no "Start" button)
10. If submission fails (network error, server error), frontend shows error message and "Retry" button preserving student answers
11. Backend prevents duplicate submissions (idempotent endpoint - if already submitted, returns success with existing score)
12. Unit tests verify submission validation and data storage
13. Integration tests verify end-to-end activity completion and submission flow
14. Submission triggers notification to teacher (implementation in Epic 5, placeholder here)

## Story 4.8: Activity Progress Persistence (Save & Resume)

As a **student**,
I want **my partial progress automatically saved so I can resume later if interrupted**,
so that **I don't lose my work if I close the browser or run out of time**.

### Acceptance Criteria:

1. Activity player auto-saves student progress every 30 seconds while activity is in progress
2. API endpoint `POST /api/assignments/{assignment_id}/save-progress` accepts partial_answers_json, time_spent_minutes
3. Backend stores progress in AssignmentStudent record using separate field: progress_json (JSONB), last_saved_at timestamp
4. "Save Progress" button in activity player footer allows manual save with visual confirmation ("Progress saved ✓")
5. When student returns to assignment detail page for in-progress assignment, "Resume Assignment" button replaces "Start Assignment"
6. Clicking "Resume" loads activity player with previously saved answers pre-filled and timer resuming from saved time
7. Progress restoration works for all activity types: multiple-choice (selected answers), word matching (created pairs), fill-in-blank (placed 
words), word search (found words)
8. If student clicks "Exit" during activity, confirmation dialog offers: "Save & Exit" or "Exit without Saving"
9. Auto-save triggers before page unload (browser close/refresh) using beforeunload event
10. Backend differentiates between progress_json (in-progress work) and answers_json (final submission)
11. Unit tests verify progress save/restore logic for each activity type
12. Integration tests verify save/resume workflow across browser sessions
13. Progress data is cleared after successful submission (only final answers_json retained)

---
