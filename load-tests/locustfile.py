"""
Dream LMS Load Tests — Read + Write Mix

Run with:
    locust -f locustfile.py --host=http://localhost:8000

Then open http://localhost:8089 to configure and start the test.

Prerequisites:
    1. Backend running on localhost:8000
    2. DB has test users (run seed or use existing dev data)
    3. Run setup first:
       curl -X POST http://localhost:8000/api/v1/dev/reset-quick-login-passwords
"""

import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from locust import HttpUser, between, events, tag, task
from locust.exception import StopUser

API = "/api/v1"

# Will be populated on test start from the /dev/quick-login-users endpoint
USER_POOL: dict[str, list[str]] = {
    "student": [],
    "teacher": [],
    "admin": [],
}


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Fetch available test users before load test begins."""
    import requests

    host = "http://localhost:8000"  # Always use backend, not whatever's in the UI
    print(f"[SETUP] Fetching test users from {host}...")

    resp = requests.get(f"{host}{API}/dev/quick-login-users")
    if resp.status_code != 200:
        print(f"[SETUP] ERROR: Could not fetch test users: {resp.status_code}")
        return

    data = resp.json()
    for role, users in data.items():
        usernames = [u["username"] for u in users if u.get("username")]
        if role in USER_POOL:
            USER_POOL[role] = usernames
        elif role in ("publisher", "supervisor"):
            pass  # skip for now

    for role, users in USER_POOL.items():
        print(f"[SETUP] {role}: {len(users)} users available")

    if not USER_POOL["student"] and not USER_POOL["teacher"]:
        print("[SETUP] WARNING: No test users found! Tests will fail.")


def _random_suffix(n=6):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


class LMSUser(HttpUser):
    """Base class for authenticated LMS users."""

    abstract = True
    host = "http://localhost:8000"
    token: str | None = None
    username: str | None = None
    role: str = "student"

    def _login(self):
        """Get auth token via instant-login (dev endpoint)."""
        users = USER_POOL.get(self.role, [])
        if not users:
            print(f"[AUTH] No {self.role} users available, falling back to form login")
            return False

        self.username = random.choice(users)
        resp = self.client.post(
            f"{API}/dev/instant-login/{self.username}",
            name=f"POST /dev/instant-login [as {self.role}]",
        )
        if resp.status_code == 200:
            self.token = resp.json()["access_token"]
            return True
        print(f"[AUTH] Failed instant login for {self.username}: {resp.status_code}")
        return False

    def _headers(self) -> dict[str, str]:
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    def _get(self, path: str, name: str | None = None, **kwargs):
        return self.client.get(
            f"{API}{path}",
            headers=self._headers(),
            name=name or f"GET {path}",
            allow_redirects=True,
            **kwargs,
        )

    def _post(self, path: str, name: str | None = None, **kwargs):
        return self.client.post(
            f"{API}{path}",
            headers=self._headers(),
            name=name or f"POST {path}",
            **kwargs,
        )

    def _patch(self, path: str, name: str | None = None, **kwargs):
        return self.client.patch(
            f"{API}{path}",
            headers=self._headers(),
            name=name or f"PATCH {path}",
            **kwargs,
        )

    def _delete(self, path: str, name: str | None = None, **kwargs):
        return self.client.delete(
            f"{API}{path}",
            headers=self._headers(),
            name=name or f"DELETE {path}",
            **kwargs,
        )


class StudentUser(LMSUser):
    """Simulates a student browsing, viewing messages, and checking assignments."""

    weight = 7  # 70% of traffic
    wait_time = between(2, 8)
    role = "student"
    _assignment_ids: list[str]

    def on_start(self):
        if not self._login():
            raise StopUser()
        self._assignment_ids = []
        self._fetch_assignment_ids()

    def _fetch_assignment_ids(self):
        """Fetch student's assignment IDs for start-assignment simulation."""
        resp = self._get("/students/me/assignments", name="GET /students/me/assignments [setup]")
        if resp.status_code == 200:
            try:
                data = resp.json()
                items = data if isinstance(data, list) else data.get("items", data.get("assignments", []))
                if isinstance(items, list):
                    self._assignment_ids = [
                        str(a["id"]) for a in items if a.get("id")
                    ][:10]
            except Exception:
                pass

    # ── Reads ──────────────────────────────────────────────────

    @tag("core", "read")
    @task(5)
    def view_assignments(self):
        """Student checks their assignment list."""
        resp = self._get("/students/me/assignments", name="GET /students/me/assignments")
        # Refresh assignment IDs periodically
        if resp.status_code == 200:
            try:
                data = resp.json()
                items = data if isinstance(data, list) else data.get("items", data.get("assignments", []))
                if isinstance(items, list):
                    self._assignment_ids = [
                        str(a["id"]) for a in items if a.get("id")
                    ][:10]
            except Exception:
                pass

    @tag("core", "read")
    @task(3)
    def view_progress(self):
        """Student checks their progress."""
        self._get("/students/me/progress", name="GET /students/me/progress")

    @tag("core", "read")
    @task(2)
    def view_calendar(self):
        """Student checks assignment calendar."""
        now = datetime.now()
        start = now.strftime("%Y-%m-%dT00:00:00")
        end = (now + timedelta(days=30)).strftime("%Y-%m-%dT23:59:59")
        self._get(
            f"/students/me/calendar?start_date={start}&end_date={end}",
            name="GET /students/me/calendar",
        )

    @tag("core", "read")
    @task(2)
    def view_badges(self):
        """Student checks their badges."""
        self._get("/students/me/badges", name="GET /students/me/badges")

    @tag("core", "read")
    @task(2)
    def view_skill_profile(self):
        """Student views skill profile."""
        self._get("/students/me/skill-profile", name="GET /students/me/skill-profile")

    @tag("core", "read")
    @task(3)
    def start_assignment(self):
        """Student starts/views an assignment — triggers DCS content fetch."""
        if not self._assignment_ids:
            return
        assignment_id = random.choice(self._assignment_ids)
        self._get(
            f"/assignments/{assignment_id}/students/me/start",
            name="GET /assignments/:id/students/me/start",
        )

    @tag("read")
    @task(1)
    def unread_message_count(self):
        """Student checks unread message count (replaces notification polling)."""
        self._get("/messages/unread-count", name="GET /messages/unread-count")

    @tag("read")
    @task(1)
    def view_messages(self):
        """Student checks message conversations."""
        self._get("/messages/conversations", name="GET /messages/conversations")

    # ── Writes ─────────────────────────────────────────────────


class TeacherUser(LMSUser):
    """Simulates a teacher managing classes, students, assignments, and announcements."""

    weight = 3  # 30% of traffic
    wait_time = between(3, 10)
    role = "teacher"
    _class_ids: list[str]
    _student_ids: list[str]
    _created_student_ids: list[str]
    _book_activities: list[dict]  # [{book_id, activity_id}, ...]
    _created_assignment_ids: list[str]

    def on_start(self):
        if not self._login():
            raise StopUser()
        self._class_ids = []
        self._student_ids = []
        self._created_student_ids = []
        self._book_activities = []
        self._created_assignment_ids = []
        # Fetch teacher's classes and students on start
        self._fetch_classes()
        self._fetch_students()
        self._fetch_books_and_activities()

    def _fetch_classes(self):
        """Fetch teacher's class IDs for write operations."""
        resp = self._get("/teachers/me/classes", name="GET /teachers/me/classes [setup]")
        if resp.status_code == 200:
            try:
                data = resp.json()
                # Handle both list response and paginated response
                classes = data if isinstance(data, list) else data.get("items", [])
                self._class_ids = [c["id"] for c in classes if c.get("id")]
            except Exception:
                pass

    def _fetch_students(self):
        """Fetch teacher's student IDs for write operations."""
        resp = self._get("/teachers/me/students", name="GET /teachers/me/students [setup]")
        if resp.status_code == 200:
            try:
                data = resp.json()
                items = data.get("items", data.get("students", []))
                if isinstance(items, list):
                    self._student_ids = [s["id"] for s in items if s.get("id")]
            except Exception:
                pass

    def _fetch_books_and_activities(self):
        """Fetch available books and their activities for assignment creation.
        Only fetches 1 book to minimize setup load."""
        resp = self._get("/books", name="GET /books [setup]")
        if resp.status_code != 200:
            return
        try:
            data = resp.json()
            books = data if isinstance(data, list) else data.get("items", data.get("books", []))
            # Only pick 1 random book to keep setup light
            if not books:
                return
            book = random.choice(books[:5])
            book_id = book.get("id") or book.get("book_id")
            if not book_id:
                return
            resp2 = self._get(
                f"/books/{book_id}/activities",
                name="GET /books/:id/activities [setup]",
            )
            if resp2.status_code == 200:
                act_data = resp2.json()
                activities = act_data if isinstance(act_data, list) else act_data.get("activities", [])
                for act in activities[:3]:
                    aid = act.get("id") or act.get("activity_id")
                    if aid:
                        self._book_activities.append({"book_id": book_id, "activity_id": str(aid)})
        except Exception:
            pass

    # ── Reads ──────────────────────────────────────────────────

    @tag("core", "read")
    @task(5)
    def view_classes(self):
        """Teacher views their class list."""
        self._get("/teachers/me/classes", name="GET /teachers/me/classes")

    @tag("core", "read")
    @task(3)
    def view_students(self):
        """Teacher views their student list."""
        self._get("/teachers/me/students", name="GET /teachers/me/students")

    @tag("core", "read")
    @task(3)
    def view_assignments(self):
        """Teacher views assignments."""
        self._get("/assignments/", name="GET /assignments [teacher]")

    @tag("read")
    @task(2)
    def list_books(self):
        """Teacher browses book catalog."""
        self._get("/books", name="GET /books [teacher]")

    @tag("read")
    @task(1)
    def view_messages(self):
        """Teacher checks conversations (includes system messages)."""
        self._get("/messages/conversations", name="GET /messages/conversations [teacher]")

    @tag("read")
    @task(1)
    def view_materials(self):
        """Teacher views teaching materials."""
        self._get("/teachers/materials", name="GET /teachers/materials")

    @tag("read")
    @task(1)
    def view_report_history(self):
        """Teacher checks report history."""
        self._get("/reports/history", name="GET /reports/history")

    @tag("read")
    @task(1)
    def view_ai_library(self):
        """Teacher views AI content library."""
        self._get("/ai/library", name="GET /ai/library")

    @tag("read")
    @task(1)
    def view_ai_usage(self):
        """Teacher checks their AI usage."""
        self._get("/ai/usage/my-usage", name="GET /ai/usage/my-usage")

    @tag("read")
    @task(1)
    def view_skills(self):
        """Teacher views skills list."""
        self._get("/skills/", name="GET /skills")

    # ── Writes ─────────────────────────────────────────────────

    @tag("write")
    @task(1)
    def create_student(self):
        """Teacher creates a new student account."""
        suffix = _random_suffix()
        resp = self._post(
            "/teachers/me/students",
            name="POST /teachers/me/students [create]",
            json={
                "username": f"lt_s_{suffix}",
                "full_name": f"LoadTest Student {suffix}",
                "password": "TestPass123!",
            },
        )
        if resp.status_code == 201:
            try:
                data = resp.json()
                # Track created student for cleanup/reuse
                role_record = data.get("role_record", {})
                sid = role_record.get("id")
                if sid:
                    self._created_student_ids.append(sid)
                    self._student_ids.append(sid)
            except Exception:
                pass

    @tag("write")
    @task(1)
    def create_class(self):
        """Teacher creates a new class."""
        suffix = _random_suffix()
        resp = self._post(
            "/teachers/me/classes",
            name="POST /teachers/me/classes [create]",
            json={
                "name": f"LoadTest Class {suffix}",
                "grade_level": str(random.randint(1, 12)),
                "subject": random.choice(["Math", "English", "Science", "History"]),
            },
        )
        if resp.status_code == 201:
            try:
                data = resp.json()
                cid = data.get("id")
                if cid:
                    self._class_ids.append(cid)
            except Exception:
                pass

    @tag("write")
    @task(1)
    def add_student_to_class(self):
        """Teacher adds a student to a class."""
        if not self._class_ids or not self._student_ids:
            return
        class_id = random.choice(self._class_ids)
        student_id = random.choice(self._student_ids)
        self._post(
            f"/teachers/me/classes/{class_id}/students",
            name="POST /teachers/me/classes/:id/students [add]",
            json=[str(student_id)],
        )

    @tag("write")
    @task(1)
    def send_message(self):
        """Teacher sends a message to a student."""
        if not self._student_ids:
            return
        # Get a student's user_id (we need the user_id, not student record id)
        # Fetch recipients list for valid IDs
        resp = self._get("/messages/recipients", name="GET /messages/recipients [for write]")
        if resp.status_code != 200:
            return
        try:
            data = resp.json()
            recipients = data.get("recipients", [])
            if not recipients:
                return
            recipient = random.choice(recipients)
            recipient_id = recipient.get("id")
            if not recipient_id:
                return
        except Exception:
            return

        self._post(
            "/messages",
            name="POST /messages [send]",
            json={
                "recipient_id": str(recipient_id),
                "subject": f"Load test msg {_random_suffix()}",
                "body": "This is an automated load test message.",
            },
        )

    @tag("write")
    @task(2)
    def create_assignment(self):
        """Teacher creates an assignment from a book activity."""
        if not self._book_activities or not self._student_ids:
            return
        ba = random.choice(self._book_activities)
        suffix = _random_suffix()
        # Pick 1-3 random students
        selected_students = random.sample(
            self._student_ids, min(3, len(self._student_ids))
        )
        payload = {
            "source_type": "book",
            "book_id": ba["book_id"],
            "activity_id": ba["activity_id"],
            "name": f"LoadTest Assignment {suffix}",
            "instructions": "This is an automated load test assignment.",
            "student_ids": [str(s) for s in selected_students],
        }
        # Optionally add a due date (50% of the time)
        if random.random() > 0.5:
            due = datetime.now(timezone.utc) + timedelta(days=random.randint(1, 14))
            payload["due_date"] = due.strftime("%Y-%m-%dT23:59:59+00:00")

        resp = self._post(
            "/assignments/",
            name="POST /assignments [create]",
            json=payload,
        )
        if resp.status_code in (200, 201):
            try:
                data = resp.json()
                aid = data.get("id")
                if aid:
                    self._created_assignment_ids.append(str(aid))
            except Exception:
                pass

    @tag("write")
    @task(1)
    def delete_created_assignment(self):
        """Teacher deletes a previously created load-test assignment (cleanup)."""
        if not self._created_assignment_ids:
            return
        assignment_id = self._created_assignment_ids.pop(0)
        self._delete(
            f"/assignments/{assignment_id}",
            name="DELETE /assignments/:id [cleanup]",
        )

    @tag("write")
    @task(1)
    def delete_created_student(self):
        """Teacher deletes a previously created load-test student (cleanup)."""
        if not self._created_student_ids:
            return
        student_id = self._created_student_ids.pop(0)
        self._delete(
            f"/teachers/me/students/{student_id}",
            name="DELETE /teachers/me/students/:id [cleanup]",
        )
        # Also remove from student_ids
        if student_id in self._student_ids:
            self._student_ids.remove(student_id)


class HealthCheckUser(LMSUser):
    """Lightweight user that only hits the health check — useful as a baseline."""

    weight = 0  # disabled by default, set to 1 to include
    wait_time = between(1, 3)

    def on_start(self):
        pass  # no auth needed

    @task
    def health_check(self):
        self.client.get(f"{API}/utils/health-check/", name="GET /health-check")


class RateLimitTester(LMSUser):
    """
    Deliberately hammers endpoints to trigger and verify rate limits.

    Fires requests with no wait to exceed limits.
    Expected: 429 responses should appear in Locust stats after ~5-30 requests.

    Run with:
        locust -f locustfile.py --host=http://localhost:8000 -t 60s -u 3 -r 3 --tags rate-limit
    """

    weight = 1  # enabled
    wait_time = between(0.1, 0.3)  # Fire rapidly
    role = "teacher"
    _hit_counts: dict[str, int]

    def on_start(self):
        if not self._login():
            raise StopUser()
        self._hit_counts = {"auth": 0, "read": 0, "write": 0}

    @tag("rate-limit")
    @task(3)
    def hammer_login(self):
        """Hit login endpoint rapidly — AUTH tier: 5/min per IP."""
        self._hit_counts["auth"] += 1
        resp = self.client.post(
            f"{API}/login/access-token",
            data={"username": "nonexistent", "password": "wrong"},
            name="[RATE-LIMIT] POST /login (AUTH 5/min)",
        )
        if resp.status_code == 429:
            print(f"[RATE-LIMIT] AUTH 429 after {self._hit_counts['auth']} requests")

    @tag("rate-limit")
    @task(5)
    def hammer_read(self):
        """Hit a read endpoint rapidly — READ tier: 120/min per user."""
        self._hit_counts["read"] += 1
        resp = self._get(
            "/teachers/me/classes",
            name="[RATE-LIMIT] GET /teachers/me/classes (READ 120/min)",
        )
        if resp.status_code == 429:
            print(f"[RATE-LIMIT] READ 429 after {self._hit_counts['read']} requests")

    @tag("rate-limit")
    @task(2)
    def hammer_write(self):
        """Hit a write endpoint rapidly — WRITE tier: 30/min per user."""
        self._hit_counts["write"] += 1
        suffix = _random_suffix()
        resp = self._post(
            "/teachers/me/classes",
            name="[RATE-LIMIT] POST /teachers/me/classes (WRITE 30/min)",
            json={
                "name": f"RateTest {suffix}",
                "grade_level": "5",
                "subject": "Test",
            },
        )
        if resp.status_code == 429:
            print(f"[RATE-LIMIT] WRITE 429 after {self._hit_counts['write']} requests")
