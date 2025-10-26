# 🎓 Dream LMS — Project Brief

## 1. Introduction

**FlowBook** is a cross-platform digital learning application designed for teachers and students.  
It transforms traditional books into interactive experiences with activities such as:
- drag-and-drop fill-in-the-blanks  
- word matching  
- multiple-choice questions  
- true/false quizzes  
- and puzzle-style word searches.  

Each book contains structured activities defined in a configuration file (`config.json`), and these activities can be tracked or assigned to students.  
FlowBook operates alongside **Dream Central Storage**, which manages all digital book data and media assets.

---

## 2. Purpose

**Dream LMS** (Learning Management System) extends the FlowBook ecosystem by enabling structured learning management.  
It connects schools, publishers, teachers, and students within a single platform where:
- admin can:
    - see and modify everything in the system, publishers, schools, teachers, students etc.
    - create and manage all account with all profiles.
    - oversee all users and data.
- publishers can:
    - create account of teacher with their school
    - control access to their content

- teachers can:
    - create/manage students accounts, 
    - assign and monitor student work,
    - give feedbacks
    - send and receive direct messages
    - generate reports for individual  
- students can:
    - complete interactive activities
    - ask questions to teacher,
    - can see their progress
---

## 3. User Roles

### 👑 Admin
The system owner with full access to all modules.  
Can create or remove users, manage schools, and oversee reports.

### 🏢 Publisher
Represents a publishing company.  
Can view and manage only their own books, create schools, and assign teachers access to specific books.

### 👩‍🏫 Teacher
Creates classes and adds students (individually or by bulk import).  
Can assign FlowBook activities as homework, set deadlines, view performance analytics, and give personalized feedback.  
Teachers can also upload supporting materials such as PDFs or videos and communicate with students through messages or notifications.

### 🎒 Student
Views assigned homework, completes interactive activities, and receives teacher feedback.  
Can review personal progress reports and track learning history.  
Receives notifications about new assignments, deadlines, and comments.

---

## 4. Core Features

### 📚 FlowBook Integration
Dream LMS uses existing book data from Dream Central Storage.  
Each book’s `config.json` defines interactive activities that can be turned into assignments.  
Teachers can pick any activity, assign it to their students, and later see their scores and common mistakes.

### 🏫 Class & Assignment Management
- Teachers create classes and add students.  
- Assign specific books, units, or activities as homework.  
- Set time limits or due dates.  
- Monitor class progress and performance over time (weekly, monthly, yearly).

### 📈 Performance & Feedback
- Teachers can see detailed student reports and statistics.  
- Identify where students make the most mistakes.  
- Provide text feedback, badges, or fun emoji reactions.  
- Students can see their progress charts and feedback history.

### 🔔 Notifications & Messaging
- In-app notification center for all users.  
- Examples: *“New book assigned,” “Deadline approaching,” “Teacher feedback received.”*  
- Basic direct messaging between teacher and student.

### 📎 Extra Materials
Teachers can upload additional course materials — PDFs, videos, or web links — and share them with students in a class or individually.

---

## 5. Vision & Next Steps

Dream LMS aims to make digital learning interactive, measurable, and enjoyable.  
By combining FlowBook’s activity-based books with structured classroom management, it helps:
- **teachers** save time and gain insight,  
- **students** stay motivated,  
- and **publishers** distribute their digital content securely.

---

**Dream LMS** bridges creative learning with data-driven teaching —  
making every book a truly interactive classroom.
