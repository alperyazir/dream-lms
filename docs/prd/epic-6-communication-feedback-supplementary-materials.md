# Epic 6: Communication, Feedback & Supplementary Materials

**Epic Goal:**

Enable rich communication between teachers and students through direct messaging, implement a comprehensive notification system for all users
(new assignments, approaching deadlines, received feedback), provide teachers with multiple feedback mechanisms (text comments, badges, emoji
reactions), and allow teachers to upload and share supplementary learning materials (PDFs, videos, web links). By the end of this epic, Dream LMS
 delivers a complete learning ecosystem where teachers can communicate effectively, provide personalized feedback, and enhance assignments with
additional resources.

## Story 6.1: Notification System Foundation

As a **user of any role**,
I want **to receive in-app notifications about important events relevant to my role**,
so that **I stay informed about new assignments, deadlines, feedback, and system updates**.

### Acceptance Criteria:

1. Notification model includes: id, user_id (FK), type (enum: assignment_created, deadline_approaching, feedback_received, message_received, 
system_announcement), title, message, link (optional URL to relevant page), is_read, created_at
2. All user role dashboards include notification bell icon in header showing unread count badge
3. Clicking notification bell opens notification dropdown/panel showing recent 10 notifications
4. Each notification displays: icon (type-specific), title, message snippet, timestamp (relative: "2 hours ago"), read/unread indicator
5. Clicking notification marks it as read and navigates to linked page (e.g., assignment detail, message thread)
6. Notification panel includes "Mark all as read" button and "View all notifications" link to full page
7. Full notifications page shows all notifications with filtering: All, Unread, By type
8. API endpoint `GET /api/notifications` returns notifications for authenticated user with pagination
9. API endpoint `PATCH /api/notifications/{id}/read` marks notification as read
10. API endpoint `POST /api/notifications/mark-all-read` marks all as read
11. Backend service `NotificationService` provides methods: `create_notification(user_id, type, title, message, link)`
12. Real-time notification delivery using polling (every 30 seconds) or WebSocket (future enhancement)
13. Notification retention: auto-delete notifications older than 30 days
14. Unit tests verify notification creation and delivery logic
15. Integration tests verify end-to-end notification flow

## Story 6.2: Assignment & Deadline Notifications

As a **student**,
I want **to receive notifications when new assignments are created and when deadlines are approaching**,
so that **I never miss homework and can plan my study time**.

### Acceptance Criteria:

1. When teacher creates assignment, system sends notification to all assigned students with type "assignment_created"
2. Notification title: "New assignment: [Assignment Name]", message: "Due: [Due Date]", link: `/assignments/{id}`
3. Daily automated job runs at 8 AM to check for approaching deadlines (due within 24 hours)
4. Students with assignments due soon receive "deadline_approaching" notification
5. Notification title: "Assignment due soon: [Assignment Name]", message: "Due in [X hours]", link: `/assignments/{id}`
6. When student completes assignment, teacher receives "student_completed" notification
7. Teacher notification: "Student completed: [Student Name] finished [Assignment Name]", score displayed, link: `/assignments/{id}/results`
8. When assignment is past due and student hasn't submitted, student receives "past_due" notification (sent once, 1 day after deadline)
9. Backend uses NotificationService to create notifications at appropriate trigger points
10. Scheduled task (cron job or Celery) handles deadline reminder checks
11. Notifications batch to avoid spam: max 1 deadline reminder per student per day (aggregates multiple assignments)
12. Students can adjust notification preferences: enable/disable deadline reminders (settings page, Story 5.8)
13. Unit tests verify notification triggers for various assignment scenarios
14. Integration tests verify scheduled tasks execute correctly

## Story 6.3: Direct Messaging Between Teachers & Students

As a **teacher**,
I want **to send and receive direct messages with my students**,
so that **I can answer questions, provide guidance, and maintain communication**.

### Acceptance Criteria:

1. Message model includes: id, sender_id (FK user), recipient_id (FK user), subject, body, parent_message_id (FK for threading), is_read, sent_at
2. Teacher and student navigation includes "Messages" menu item with unread count badge
3. Messages page displays inbox with list of conversations (grouped by participants)
4. Each conversation shows: participant name/photo, last message preview, timestamp, unread indicator
5. Clicking conversation opens message thread view showing all messages in chronological order
6. **Compose New Message**: Button opens modal with fields: recipient (searchable dropdown - teacher sees their students, student sees their
teachers), subject, message body (rich text editor with formatting)
7. **Message Thread View**: Shows all messages in conversation with sender name, timestamp, message body
8. **Reply**: Text input at bottom of thread to send reply (auto-fills recipient and subject as "Re: [subject]")
9. API endpoint `POST /api/messages` creates new message and sends notification to recipient
10. API endpoint `GET /api/messages/conversations` returns list of conversations for authenticated user
11. API endpoint `GET /api/messages/thread/{user_id}` returns full message thread with specific user
12. When message is received, recipient gets "message_received" notification
13. Marking message as read updates is_read flag and clears notification
14. Search functionality allows finding messages by participant name or subject
15. Messages include basic XSS protection (sanitize HTML input)
16. Teacher can message multiple students (creates separate threads, not group chat)
17. Students can only message teachers who have assigned them work (privacy protection)
18. Integration tests verify messaging workflow between teacher and student

## Story 6.4: Teacher Feedback on Assignments (Text Comments)

As a **teacher**,
I want **to provide written feedback on completed student assignments**,
so that **students understand what they did well and where to improve**.

### Acceptance Criteria:

1. Assignment results page (teacher view) includes "Provide Feedback" button for each completed assignment
2. Clicking button opens feedback modal with: student name, assignment name, score, text area for feedback
3. Feedback model includes: id, assignment_student_id (FK AssignmentStudent junction table), teacher_id (FK), feedback_text, badges (array),
emoji_reactions (array), created_at, updated_at
4. Teacher can write detailed feedback (max 1000 characters) with formatting support
5. Feedback can be saved as draft (not visible to student) or published (student sees immediately)
6. API endpoint `POST /api/assignments/{assignment_id}/students/{student_id}/feedback` creates or updates feedback
7. When feedback is published, student receives "feedback_received" notification
8. Student notification: "Feedback received on [Assignment Name]", link: `/assignments/{id}`
9. Student assignment detail page shows feedback section below their results with: teacher name, feedback text, timestamp
10. Teacher can edit feedback after publishing (student sees updated version)
11. Assignment results review shows feedback indicator (icon) next to students who have received feedback
12. Feedback history is preserved (audit trail of edits) with updated_at timestamp
13. Students can reply to feedback via message thread (opens messaging with pre-filled context)
14. Unit tests verify feedback creation and update logic
15. Integration tests verify feedback notification delivery

## Story 6.5: Feedback Enhancements (Badges & Emoji Reactions)

As a **teacher**,  
I want **to award badges and add emoji reactions to student work**,  
so that **I can provide quick, encouraging, visual feedback**.

### Acceptance Criteria:

1. Feedback modal (from Story 5.4) includes badge selection section with predefined badges
2. **Predefined Badges**: "Perfect Score 💯", "Great Improvement 📈", "Creative Thinking 💡", "Hard Worker 💪", "Fast Learner ⚡", "Needs Review 
📚"
3. Teacher can select multiple badges to award (checkboxes)
4. Feedback modal includes emoji reaction picker (similar to social media reactions)
5. **Available Emoji Reactions**: 👍, ❤️, 🌟, 🎉, 🔥, 💯 (customizable via admin settings)
6. Teacher can select one emoji reaction per feedback instance
7. Selected badges and emoji are stored in Feedback model (badges array, emoji_reactions array)
8. Student assignment results page displays awarded badges as visual icons/labels
9. Student progress page shows "Badges Earned" section with count of each badge type
10. Badge achievements contribute to student motivation (displayed prominently on dashboard)
11. When badge is awarded, student notification includes badge name: "You earned 'Perfect Score' badge!"
12. Emoji reactions appear next to feedback text in student view (larger display)
13. Teacher can remove badges/emoji by deselecting and updating feedback
14. System tracks badge totals for student analytics (e.g., "Earned 15 badges this month")
15. Unit tests verify badge and emoji storage and retrieval
16. Badges are purely motivational (no grade impact)

## Story 6.6: Supplementary Materials Upload & Management

As a **teacher**,
I want **to upload PDFs, videos, and web links as supplementary materials**,
so that **I can provide additional learning resources to my students**.

### Acceptance Criteria:

1. Material model includes: id, teacher_id (FK), title, description, material_type (enum: pdf, video, link), file_url (for uploaded files), 
external_url (for links), file_size_bytes, created_at, updated_at
2. MaterialAssignment model (junction): id, material_id (FK), assignment_id (FK, nullable), class_id (FK, nullable), student_id (FK, nullable),
shared_at
3. Teacher dashboard includes "Materials" section or dedicated materials library page
4. Materials library displays uploaded materials in grid/list view with: thumbnail/icon, title, type badge, upload date
5. **Upload Material Button** opens modal with tabs: "Upload File" (PDF/Video), "Add Link"
6. **Upload File Tab**: Drag-and-drop area accepting PDF (max 50 MB), video files MP4/MOV (max 100 MB), title field, description field
7. **Add Link Tab**: URL input (validates URL format), title field, description field, optional thumbnail URL
8. File upload sends file to Dream Central Storage via backend proxy endpoint
9. API endpoint `POST /api/materials` handles file upload/link creation and stores reference in database
10. Backend validates: file type, file size, teacher ownership, storage quota (500 MB per teacher default)
11. Teacher can edit material metadata (title, description) and delete materials with confirmation
12. Deleting material removes it from Dream Central Storage (if file) and database
13. Materials library includes search and filter by type (PDF, Video, Link)
14. Teacher can view material details and preview (PDF viewer, video player, link preview)
15. Integration tests verify file upload to Dream Central Storage and database record creation

## Story 6.7: Sharing Materials with Students

As a **teacher**,  
I want **to share supplementary materials with specific students, classes, or attach to assignments**,  
so that **students have access to resources that support their learning**.

### Acceptance Criteria:

1. Material detail page (teacher view) includes "Share" button opening share modal
2. Share modal provides options: "Share with Class", "Share with Students", "Attach to Assignment"
3. **Share with Class**: Multi-select dropdown showing teacher's classes, confirmation creates MaterialAssignment records for all students in 
selected classes
4. **Share with Students**: Multi-select dropdown showing teacher's students, confirmation creates MaterialAssignment records for selected 
students
5. **Attach to Assignment**: Dropdown showing teacher's assignments, attaches material to assignment (visible when students view assignment 
details)
6. When material is shared, students receive "material_shared" notification
7. Notification: "New learning material: [Material Title]", link: `/materials/{id}`
8. Student dashboard includes "Materials" section showing shared materials
9. Student materials page displays: material title, teacher name, shared date, type badge, "View" button
10. Clicking "View" opens: PDF in browser viewer, video in embedded player, link opens in new tab
11. Students can only access materials shared with them (filtered by MaterialAssignment.student_id)
12. Assignment detail page (student view) shows attached materials section: "Supplementary Resources"
13. Teacher can unshare materials (delete MaterialAssignment records) with confirmation
14. Teacher can see sharing history: which students/classes have access to each material
15. API endpoint `POST /api/materials/{id}/share` creates MaterialAssignment records
16. API endpoint `DELETE /api/materials/{id}/share/{share_id}` removes access
17. Integration tests verify material sharing and student access control

## Story 6.8: Notification Preferences & Settings

As a **user of any role**,
I want **to customize my notification preferences**,
so that **I receive notifications that matter to me without being overwhelmed**.

### Acceptance Criteria:

1. User settings page includes "Notifications" tab with preference controls
2. NotificationPreference model: id, user_id (FK), notification_type, enabled (boolean), email_enabled (boolean, future email notifications)
3. Preferences page lists all notification types relevant to user role with toggle switches
4. **Student Notification Preferences**: Assignment Created (on/off), Deadline Approaching (on/off), Feedback Received (on/off), Message Received
 (on/off)
5. **Teacher Notification Preferences**: Student Completed Assignment (on/off), Message Received (on/off), System Announcements (on/off)
6. **Admin/Publisher Notification Preferences**: System Announcements (on/off), User Activity Alerts (on/off)
7. Default settings: All notifications enabled for new users
8. Changing preference immediately updates database and affects future notifications
9. API endpoint `GET /api/users/me/notification-preferences` returns current preferences
10. API endpoint `PATCH /api/users/me/notification-preferences` updates preferences
11. NotificationService checks user preferences before creating notifications (respects enabled flags)
12. Settings page includes "Email Notifications" section (disabled/grayed out with "Coming soon" label - future phase)
13. Global notification mute: "Pause all notifications" toggle for temporary silence (24-hour max)
14. Unit tests verify preference filtering logic
15. Integration tests verify notifications respect user preferences

---
