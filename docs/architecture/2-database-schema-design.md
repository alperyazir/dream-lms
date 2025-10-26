# 2. Database Schema Design

## 2.1 Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│   users         │
├─────────────────┤
│ id (UUID) PK    │
│ email (unique)  │
│ password_hash   │
│ role (enum)     │──┐
│ is_active       │  │
│ created_at      │  │
│ updated_at      │  │
└─────────────────┘  │
                     │
     ┌───────────────┼───────────────┬─────────────┐
     │               │               │             │
     ▼               ▼               ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐
│publishers│  │ teachers │  │ students │  │   admins    │
├──────────┤  ├──────────┤  ├──────────┤  ├─────────────┤
│id PK     │  │id PK     │  │id PK     │  │id PK        │
│user_id FK│  │user_id FK│  │user_id FK│  │user_id FK   │
│name      │  │school_id │  │grade     │  │permissions  │
│contact   │  │subject   │  │parent_em │  └─────────────┘
└────┬─────┘  └────┬─────┘  └──────────┘
     │             │
     │             │
     ▼             │
┌──────────┐       │
│ schools  │◄──────┘
├──────────┤
│id PK     │
│name      │
│publisher_id FK
│address   │
│contact   │
└────┬─────┘
     │
     │         ┌──────────────┐
     └────────>│  classes     │
               ├──────────────┤
               │id PK         │
               │name          │
               │teacher_id FK │
               │school_id FK  │
               │grade_level   │
               │subject       │
               │academic_year │
               │is_active     │
               └────┬─────────┘
                    │
                    │ ┌───────────────────┐
                    └>│ class_students    │
                      ├───────────────────┤
                      │ id PK             │
                      │ class_id FK       │
                      │ student_id FK     │
                      │ enrolled_at       │
                      └───────────────────┘


┌──────────────────────┐         ┌──────────────────────┐
│   books              │         │   activities         │
├──────────────────────┤         ├──────────────────────┤
│ id PK                │         │ id PK                │
│ dream_storage_id     │◄────────│ book_id FK           │
│ title                │         │ dream_activity_id    │
│ publisher_id FK      │         │ activity_type        │
│ description          │         │ title                │
│ cover_image_url      │         │ config_json (JSONB)  │
│ created_at           │         │ order_index          │
│ updated_at           │         └────┬─────────────────┘
└────┬─────────────────┘              │
     │                                 │
     │  ┌────────────────┐             │
     └─>│  book_access   │             │
        ├────────────────┤             │
        │ id PK          │             │
        │ book_id FK     │             │
        │ publisher_id FK│             │
        │ granted_at     │             │
        └────────────────┘             │
                                       │
                                       ▼
                           ┌────────────────────────┐
                           │   assignments          │
                           ├────────────────────────┤
                           │ id PK                  │
                           │ teacher_id FK          │
                           │ activity_id FK         │
                           │ book_id FK             │
                           │ name                   │
                           │ instructions           │
                           │ due_date               │
                           │ time_limit_minutes     │
                           │ created_at             │
                           │ updated_at             │
                           └────┬───────────────────┘
                                │
                                │
                                ▼
                    ┌──────────────────────────┐
                    │ assignment_students      │
                    ├──────────────────────────┤
                    │ id PK                    │
                    │ assignment_id FK         │
                    │ student_id FK            │
                    │ status (enum)            │
                    │ score                    │
                    │ answers_json (JSONB)     │
                    │ progress_json (JSONB)    │
                    │ started_at               │
                    │ completed_at             │
                    │ time_spent_minutes       │
                    └────┬─────────────────────┘
                         │
                         │
                         ▼
                    ┌──────────────────────────┐
                    │   feedback               │
                    ├──────────────────────────┤
                    │ id PK                    │
                    │ assignment_student_id FK │
                    │ teacher_id FK            │
                    │ feedback_text            │
                    │ badges (ARRAY)           │
                    │ emoji_reactions (ARRAY)  │
                    │ created_at               │
                    │ updated_at               │
                    └──────────────────────────┘


┌────────────────────────┐
│   messages             │
├────────────────────────┤
│ id PK                  │
│ sender_id FK (users)   │
│ recipient_id FK (users)│
│ subject                │
│ body                   │
│ parent_message_id FK   │
│ is_read                │
│ sent_at                │
└────────────────────────┘


┌────────────────────────┐         ┌──────────────────────────┐
│   notifications        │         │ notification_preferences │
├────────────────────────┤         ├──────────────────────────┤
│ id PK                  │         │ id PK                    │
│ user_id FK             │◄────────│ user_id FK               │
│ type (enum)            │         │ notification_type        │
│ title                  │         │ enabled                  │
│ message                │         │ email_enabled            │
│ link                   │         └──────────────────────────┘
│ is_read                │
│ created_at             │
└────────────────────────┘


┌────────────────────────┐         ┌──────────────────────────┐
│   materials            │         │ material_assignments     │
├────────────────────────┤         ├──────────────────────────┤
│ id PK                  │         │ id PK                    │
│ teacher_id FK          │◄────────│ material_id FK           │
│ title                  │         │ assignment_id FK         │
│ description            │         │ class_id FK              │
│ material_type (enum)   │         │ student_id FK            │
│ file_url               │         │ shared_at                │
│ external_url           │         └──────────────────────────┘
│ file_size_bytes        │
│ created_at             │
│ updated_at             │
└────────────────────────┘
```

## 2.2 Complete Table Definitions

Due to the comprehensive nature of the database schema, I'll include the full SQL definitions with detailed comments. This is extensive but critical for implementation.

### **2.2.1 User Management Tables**

**Table: `users`**

Core authentication table for all system users.

```sql
CREATE TYPE user_role AS ENUM ('admin', 'publisher', 'teacher', 'student');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Table: `publishers`**

```sql
CREATE TABLE publishers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publishers_user_id ON publishers(user_id);
```

**Table: `schools`**

```sql
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    address TEXT,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_publisher_id ON schools(publisher_id);
```

**Table: `teachers`**

```sql
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    subject_specialization VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_school_id ON teachers(school_id);
```

**Table: `students`**

```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grade_level VARCHAR(50),
    parent_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_user_id ON students(user_id);
```

### **2.2.2 Content & Book Management Tables**

**Table: `books`**

```sql
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dream_storage_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    description TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_books_publisher_id ON books(publisher_id);
CREATE INDEX idx_books_dream_storage_id ON books(dream_storage_id);
```

**Table: `book_access`**

```sql
CREATE TABLE book_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(book_id, publisher_id)
);

CREATE INDEX idx_book_access_book_publisher ON book_access(book_id, publisher_id);
```

**Table: `activities`**

```sql
CREATE TYPE activity_type AS ENUM (
    'dragdroppicture',
    'dragdroppicturegroup',
    'matchTheWords',
    'circle',
    'markwithx',
    'puzzleFindWords'
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    dream_activity_id VARCHAR(255),
    activity_type activity_type NOT NULL,
    title VARCHAR(500),
    config_json JSONB NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_book_id ON activities(book_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_config_json ON activities USING GIN(config_json);
```

### **2.2.3 Class Management Tables**

**Table: `classes`**

```sql
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade_level VARCHAR(50),
    subject VARCHAR(100),
    academic_year VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_is_active ON classes(is_active);
```

**Table: `class_students`**

```sql
CREATE TABLE class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(class_id, student_id)
);

CREATE INDEX idx_class_students_class_id ON class_students(class_id);
CREATE INDEX idx_class_students_student_id ON class_students(student_id);
```

### **2.2.4 Assignment & Completion Tables**

**Table: `assignments`**

```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    instructions TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    time_limit_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT time_limit_positive CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0)
);

CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_activity_id ON assignments(activity_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
```

**Table: `assignment_students`**

```sql
CREATE TYPE assignment_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TABLE assignment_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status assignment_status DEFAULT 'not_started',
    score INTEGER,
    answers_json JSONB,
    progress_json JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_minutes INTEGER DEFAULT 0,
    last_saved_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(assignment_id, student_id),
    CONSTRAINT score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX idx_assignment_students_assignment_id ON assignment_students(assignment_id);
CREATE INDEX idx_assignment_students_student_id ON assignment_students(student_id);
CREATE INDEX idx_assignment_students_status ON assignment_students(status);
CREATE INDEX idx_assignment_students_completed_at ON assignment_students(completed_at);
CREATE INDEX idx_assignment_students_answers_json ON assignment_students USING GIN(answers_json);
```

### **2.2.5 Communication Tables**

**Table: `messages`**

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT no_self_messaging CHECK (sender_id != recipient_id)
);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read);
```

**Table: `notifications`**

```sql
CREATE TYPE notification_type AS ENUM (
    'assignment_created',
    'deadline_approaching',
    'feedback_received',
    'message_received',
    'student_completed',
    'past_due',
    'material_shared',
    'system_announcement'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
```

**Table: `notification_preferences`**

```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,

    UNIQUE(user_id, notification_type)
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
```

**Table: `feedback`**

```sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_student_id UUID UNIQUE NOT NULL REFERENCES assignment_students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    feedback_text TEXT,
    badges TEXT[],
    emoji_reactions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_assignment_student_id ON feedback(assignment_student_id);
CREATE INDEX idx_feedback_teacher_id ON feedback(teacher_id);
```

### **2.2.6 Material Management Tables**

**Table: `materials`**

```sql
CREATE TYPE material_type AS ENUM ('pdf', 'video', 'link');

CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    material_type material_type NOT NULL,
    file_url TEXT,
    external_url TEXT,
    file_size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT file_or_link CHECK (
        (material_type = 'link' AND external_url IS NOT NULL) OR
        (material_type IN ('pdf', 'video') AND file_url IS NOT NULL)
    )
);

CREATE INDEX idx_materials_teacher_id ON materials(teacher_id);
CREATE INDEX idx_materials_type ON materials(material_type);
```

**Table: `material_assignments`**

```sql
CREATE TABLE material_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT at_least_one_target CHECK (
        assignment_id IS NOT NULL OR class_id IS NOT NULL OR student_id IS NOT NULL
    )
);

CREATE INDEX idx_material_assignments_material_id ON material_assignments(material_id);
CREATE INDEX idx_material_assignments_assignment_id ON material_assignments(assignment_id);
CREATE INDEX idx_material_assignments_class_id ON material_assignments(class_id);
CREATE INDEX idx_material_assignments_student_id ON material_assignments(student_id);
```

## 2.3 Composite Indexes for Analytics

Performance-critical composite indexes for common query patterns:

```sql
-- Teacher accessing their students' assignments
CREATE INDEX idx_teacher_student_assignments
ON assignment_students(student_id, status, completed_at)
WHERE status = 'completed';

-- Class analytics queries
CREATE INDEX idx_class_analytics
ON assignment_students(assignment_id, status, score)
INCLUDE (completed_at, time_spent_minutes);

-- Student progress queries
CREATE INDEX idx_student_progress
ON assignment_students(student_id, completed_at DESC, score);

-- Deadline notifications
CREATE INDEX idx_upcoming_deadlines
ON assignments(due_date, teacher_id)
WHERE due_date > CURRENT_TIMESTAMP;

-- Unread notifications
CREATE INDEX idx_unread_notifications
ON notifications(user_id, created_at DESC)
WHERE is_read = false;
```

## 2.4 Database Functions & Triggers

**Auto-update `updated_at` timestamp:**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publishers_updated_at BEFORE UPDATE ON publishers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (Repeat for: schools, teachers, students, books, activities, classes,
--  assignments, assignment_students, feedback, materials)
```

**Automatic notification cleanup:**

```sql
-- Delete notifications older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule via cron or backend job
```

## 2.5 Data Retention Policy

| Entity | Retention | Strategy |
|--------|-----------|----------|
| Users (active) | Indefinite | Active accounts retained |
| Users (inactive) | 2 years | Soft delete, then hard delete |
| Assignments (completed) | 2 years | Archive to cold storage |
| Analytics aggregates | Indefinite | Keep for historical reporting |
| Notifications | 30 days | Auto-delete (see trigger above) |
| Messages | 1 year | Archive old threads |
| Progress data | Until assignment deleted | Tied to assignment lifecycle |

---
