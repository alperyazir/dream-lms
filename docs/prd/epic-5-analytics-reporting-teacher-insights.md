# Epic 5: Analytics, Reporting & Teacher Insights

**Epic Goal:**

Provide teachers with comprehensive performance analytics and reporting tools to understand student progress, identify learning gaps, and make
data-driven instructional decisions. Enable teachers to view individual student performance, class-wide statistics, error pattern analysis, and
configurable time-period reports (weekly, monthly, yearly). Students can view their own progress charts and learning history. By the end of this
epic, teachers have actionable insights to support their students effectively, and students can track their own growth.

## Story 5.1: Individual Student Performance Dashboard

As a **teacher**,
I want **to view detailed performance metrics for any individual student**,
so that **I can understand their strengths, weaknesses, and progress over time**.

### Acceptance Criteria:

1. Teacher can access student performance page from: class roster (clicking student name), assignment detail view (clicking student), or search
2. Student performance dashboard displays header with: student name, profile photo (if available), overall average score, total assignments
completed, current streak (consecutive days with completed work)
3. **Recent Activity Section**: List of last 10 completed assignments with score, completion date, time spent
4. **Performance Chart**: Line graph showing score trends over time (x-axis: date, y-axis: score percentage)
5. Chart allows time period selection: Last 7 days, Last 30 days, Last 3 months, All time
6. **Subject/Activity Breakdown**: Bar chart or table showing average scores by activity type (multiple-choice, true/false, word matching, etc.)
7. **Assignment Status Summary**: Counts for: not started, in progress, completed, past due
8. **Time Analytics**: Average time spent per assignment, total learning time this week/month
9. API endpoint `GET /api/students/{student_id}/analytics` returns aggregated performance data with date range filtering
10. Backend calculates: average score, completion rate, activity type performance, time-based metrics
11. Teacher can export student report as PDF with all charts and statistics
12. Page includes "Send Message" and "View Full History" action buttons
13. Data visualizations use Recharts library for consistency
14. Responsive design: charts stack vertically on mobile/tablet
15. Integration tests verify data accuracy across different date ranges

## Story 5.2: Class-Wide Performance Analytics

As a **teacher**,
I want **to view aggregated performance metrics for an entire class**,
so that **I can identify class-wide trends and adjust my teaching strategy**.

### Acceptance Criteria:

1. Class detail page includes "Analytics" tab alongside "Students" and "Assignments" tabs
2. **Class Overview Section**: Displays average class score, completion rate, total assignments given, active students count
3. **Score Distribution Chart**: Histogram showing how many students fall into score ranges (0-59%, 60-69%, 70-79%, 80-89%, 90-100%)
4. **Leaderboard**: Top 5 performing students (by average score) with option to view full ranked list
5. **Struggling Students Alert**: Highlights students with average score below 70% or multiple past due assignments
6. **Assignment Performance Table**: Lists all assignments with columns: assignment name, average score, completion rate, average time spent
7. **Activity Type Performance**: Bar chart comparing class average across different activity types
8. **Time Period Selector**: Weekly, Monthly, Semester, Year-to-Date filtering for all metrics
9. **Trend Analysis**: Comparison metrics showing improvement/decline vs. previous period (e.g., "Average score up 5% from last month")
10. API endpoint `GET /api/classes/{class_id}/analytics` returns aggregated class data
11. Backend performs efficient aggregation queries with proper indexing
12. Teacher can export class report as PDF or Excel with all data
13. Visual indicators for positive trends (green arrows) and concerning trends (red arrows)
14. Integration tests verify accurate aggregation across multiple students and assignments

## Story 5.3: Assignment-Specific Analytics & Common Mistakes

As a **teacher**,
I want **to see detailed results for a specific assignment including which questions students struggled with**,
so that **I can identify common misconceptions and reteach difficult concepts**.

### Acceptance Criteria:

1. Assignment detail page includes "Results" tab showing completion statistics
2. **Completion Overview**: Shows completed count, in progress count, not started count, past due count with visual progress bar
3. **Score Statistics**: Displays average score, median score, highest score, lowest score
4. **Student Results Table**: Lists all assigned students with columns: student name, status, score, time spent, completion date, "View Details"
button
5. Table is sortable by any column and filterable by status
6. **Question-Level Analysis** (activity-type specific):
   - Multiple-choice/True-False: Shows each question with percentage of students who answered correctly
   - **Most Missed Questions**: Highlights top 3 questions with lowest correct percentage
   - **Answer Distribution**: For each question, shows how many students selected each option
7. Word matching: Shows which pairs were most commonly matched incorrectly
8. Fill-in-blank: Shows which blanks had lowest correct rate and common incorrect answers
9. Word search: Shows which words were found least often
10. API endpoint `GET /api/assignments/{assignment_id}/detailed-results` returns question-level analytics
11. Backend aggregates answers_json from all students to calculate question statistics
12. Visual heatmap for multiple-choice showing correct (green) vs. incorrect (red) answer distributions
13. Teacher can click "View Details" for individual student to see their full submitted answers
14. Export functionality for assignment results (PDF/Excel)
15. Integration tests verify accurate question-level aggregation

## Story 5.4: Error Pattern Detection & Insights

As a **teacher**,  
I want **the system to automatically identify patterns in student errors across assignments**,  
so that **I can discover systematic learning gaps without manual analysis**.

### Acceptance Criteria:

1. Teacher dashboard includes "Insights" card showing AI-generated or rule-based learning insights
2. **Pattern Detection**: System analyzes completed assignments to identify: topics/concepts with consistently low performance, students who 
struggle with specific activity types, time-of-day patterns (if students rush assignments close to deadline)
3. **Insight Categories**:
   - "Students struggling with [topic]" - based on low scores in related questions
   - "Common misconception detected" - same wrong answer chosen by >50% of students
   - "Time management issue" - students with incomplete work or rushing (very short completion times with low scores)
   - "Recommended review topics" - concepts requiring reteaching based on error rates
4. Insights page displays cards for each detected pattern with: description, affected student count, recommended action
5. Teacher can click insight card to view: detailed breakdown, list of affected students, related assignments/questions
6. API endpoint `GET /api/teachers/insights` returns pattern analysis for teacher's classes
7. Backend implements rule-based pattern detection (ML/AI enhancement is future phase):
   - Query assignments with avg score < 65%
   - Identify questions where >60% answered incorrectly
   - Flag students with >3 past due assignments
   - Detect activity types where student consistently underperforms
8. Insights are cached and refreshed daily (not real-time to reduce compute)
9. Teacher can dismiss insights that aren't actionable
10. Visual indicators: warning (yellow) for moderate concerns, alert (red) for critical issues
11. Integration tests verify pattern detection logic with sample data

## Story 5.5: Student Progress Tracking & Personal Analytics

As a **student**,  
I want **to view my own performance statistics and progress over time**,  
so that **I can track my learning growth and identify areas to improve**.

### Acceptance Criteria:

1. Student dashboard includes "My Progress" section or dedicated progress page
2. **Overall Performance Card**: Shows total assignments completed, overall average score, current streak, recent achievements
3. **Progress Chart**: Line graph showing score trends over time (last 30 days default)
4. **Activity Type Breakdown**: Shows student's average score for each activity type with visual comparison (bar chart or radial chart)
5. **Recent Assignments**: List of last 5 completed assignments with scores and feedback indicator
6. **Achievements/Badges** (if Epic 5 feedback implemented): Display earned badges (e.g., "Perfect Score", "10 Day Streak", "Fast Learner")
7. **Study Time**: Total time spent on assignments this week/month
8. **Improvement Indicators**: Shows whether recent scores are improving, stable, or declining with encouraging messaging
9. API endpoint `GET /api/students/me/progress` returns student's performance analytics
10. Charts use student-friendly, encouraging language (e.g., "You're improving!" vs. "Performance declining")
11. Data visualizations use colors and icons that are motivating for students
12. Student can filter progress view by date range: This week, This month, All time
13. Progress page includes tips: "Try reviewing [activity type] to improve your score"
14. Responsive mobile design since students may primarily view on phones
15. Integration tests verify accurate student-specific data filtering

## Story 5.6: Time-Based Reporting & Trend Analysis

As a **teacher**,  
I want **to generate reports for specific time periods and compare performance across weeks/months**,  
so that **I can track progress over the school year and prepare for parent-teacher conferences**.

### Acceptance Criteria:

1. Teacher navigation includes "Reports" section with report builder interface
2. **Report Builder**: Form to configure report with fields: Report type (student/class/assignment), time period (custom date range, week, month,
 semester), target (select class or student), format (PDF/Excel)
3. **Predefined Report Templates**:
   - "Weekly Class Summary" - class performance for selected week
   - "Student Progress Report" - individual student for semester/year
   - "Monthly Assignment Overview" - all assignments in a month
   - "Parent-Teacher Conference Report" - comprehensive student report
4. Report generation triggers backend job that compiles requested data
5. Generated reports include: cover page with date range and teacher name, summary statistics, detailed tables, charts (embedded in PDF), 
comparison to previous period
6. **Trend Analysis**: Reports show percentage change vs. previous equivalent period (e.g., "This month's avg score: 85% (+7% from last month)")
7. Reports include narrative summaries: "Students showed improvement in multiple-choice activities but struggled with word searches"
8. API endpoint `POST /api/reports/generate` accepts report configuration and returns report file or job ID
9. For large reports, use asynchronous job processing with status endpoint `GET /api/reports/{job_id}/status`
10. Generated reports are stored temporarily and accessible via download link
11. Teacher can save report configurations as templates for recurring use
12. Report history shows previously generated reports with download links (7-day retention)
13. Unit tests verify report data accuracy and formatting
14. Integration tests verify end-to-end report generation workflow

## Story 5.7: Performance Comparison & Benchmarking

As a **teacher**,
I want **to compare my class performance against school or publisher averages (anonymized)**,
so that **I can understand if my students are on track relative to peers**.

### Acceptance Criteria:

1. Class analytics page includes "Benchmarking" section (if enabled by school/publisher)
2. Displays comparison metrics: "Your class average: 82% | School average: 78% | Publisher average: 80%"
3. Comparison chart shows class performance vs. aggregated benchmarks over time (line graph)
4. Benchmarks are calculated anonymously across: all classes in the same school, all classes using the same publisher's content (opt-in for
privacy)
5. Activity-type benchmarking: "Your class scores 15% higher in word matching compared to school average"
6. Backend calculates aggregated benchmarks with proper anonymization (minimum 5 classes required for benchmark display)
7. API endpoint `GET /api/classes/{class_id}/benchmarks` returns comparison data if available
8. Privacy controls: Teachers cannot see other teachers' specific class data, only aggregates
9. Benchmarking can be disabled at school/publisher level for privacy compliance
10. Encouraging messaging when class outperforms benchmarks: "Your class is excelling!"
11. Constructive messaging when below benchmarks: "Opportunities for growth in [area]"
12. Admin dashboard shows system-wide benchmarks for oversight
13. Integration tests verify benchmark calculations and anonymization

---
