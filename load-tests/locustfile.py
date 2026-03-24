"""
Dream LMS Load Tests — Realistic Read + Write Mix

Run with:
    locust -f locustfile.py --host=http://localhost:8000

Then open http://localhost:8089 to configure and start the test.

Prerequisites:
    1. Backend running on localhost:8000
    2. DB seeded with load test data:
       cd backend && python scripts/seed_load_test.py
    3. No password reset needed — uses /dev/instant-login (bypasses password)
"""

import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from locust import HttpUser, between, events, tag, task
from locust.exception import StopUser

API = "/api/v1"

# Will be populated on test start from /dev/load-test-users
USER_POOL: dict[str, list[str]] = {
    "student": [],
    "teacher": [],
}

# Activity IDs available for assignment creation (populated on test start)
ACTIVITY_IDS: list[str] = []
DCS_BOOK_ID: int = 46  # Book with activities in the DB

# Track which usernames are already claimed to avoid contention
_user_index: dict[str, int] = {"student": 0, "teacher": 0}


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Fetch available load-test users before the test begins."""
    import requests

    host = environment.host or "http://localhost:8000"
    print(f"[SETUP] Fetching load-test users from {host}...")

    # Fetch teachers (up to 500)
    resp = requests.get(f"{host}{API}/dev/load-test-users?role=teacher&limit=500")
    if resp.status_code == 200:
        data = resp.json()
        USER_POOL["teacher"] = data.get("usernames", [])
    print(f"[SETUP] Teachers: {len(USER_POOL['teacher'])} available")

    # Fetch students in batches (up to 10k for the active pool)
    all_students = []
    for offset in range(0, 10000, 5000):
        resp = requests.get(
            f"{host}{API}/dev/load-test-users?role=student&limit=5000&offset={offset}"
        )
        if resp.status_code == 200:
            data = resp.json()
            batch = data.get("usernames", [])
            all_students.extend(batch)
            if len(batch) < 5000:
                break
    USER_POOL["student"] = all_students
    print(f"[SETUP] Students: {len(USER_POOL['student'])} available")

    if not USER_POOL["student"] and not USER_POOL["teacher"]:
        print("[SETUP] WARNING: No load-test users found! Run seed_load_test.py first.")

    # Fetch activity IDs for assignment creation
    # Login as a teacher to fetch activities for the target book
    if USER_POOL["teacher"]:
        t_resp = requests.post(f"{host}{API}/dev/instant-login/{USER_POOL['teacher'][0]}")
        if t_resp.status_code == 200:
            token = t_resp.json()["access_token"]
            a_resp = requests.get(
                f"{host}{API}/books/{DCS_BOOK_ID}/activities",
                headers={"Authorization": f"Bearer {token}"},
            )
            if a_resp.status_code == 200:
                activities = a_resp.json()
                if isinstance(activities, list):
                    ACTIVITY_IDS.extend([str(a["id"]) for a in activities if a.get("id")])
                elif isinstance(activities, dict):
                    items = activities.get("items", activities.get("activities", []))
                    ACTIVITY_IDS.extend([str(a["id"]) for a in items if a.get("id")])
    print(f"[SETUP] Activities: {len(ACTIVITY_IDS)} available for book {DCS_BOOK_ID}")


def _random_suffix(n=6):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


def _claim_username(role: str) -> str | None:
    """Get a unique username from the pool (round-robin)."""
    users = USER_POOL.get(role, [])
    if not users:
        return None
    idx = _user_index.get(role, 0) % len(users)
    _user_index[role] = idx + 1
    return users[idx]


class LMSUser(HttpUser):
    """Base class for authenticated LMS users."""

    abstract = True
    host = "http://localhost:8000"
    token: str | None = None
    username: str | None = None
    role: str = "student"

    def _login(self):
        """Get auth token via instant-login (dev endpoint)."""
        self.username = _claim_username(self.role)
        if not self.username:
            print(f"[AUTH] No {self.role} users in pool")
            return False

        resp = self.client.post(
            f"{API}/dev/instant-login/{self.username}",
            name="POST /dev/instant-login",
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

    def _delete(self, path: str, name: str | None = None, **kwargs):
        return self.client.delete(
            f"{API}{path}",
            headers=self._headers(),
            name=name or f"DELETE {path}",
            **kwargs,
        )


# ─────────────────────────────────────────────────────────────
# Student: Reads + Assignment Submission
# ─────────────────────────────────────────────────────────────

class StudentUser(LMSUser):
    """Simulates a real student: browse assignments, start one, submit answers."""

    weight = 7  # 70% of traffic
    wait_time = between(2, 8)  # Realistic think time
    role = "student"
    _assignment_ids: list[str]
    _in_progress_ids: list[str]
    _not_started_ids: list[str]

    def on_start(self):
        if not self._login():
            raise StopUser()
        self._assignment_ids = []
        self._in_progress_ids = []
        self._not_started_ids = []
        self._fetch_assignments()

    def _fetch_assignments(self):
        """Fetch student's assignments and categorize by status."""
        resp = self._get("/students/me/assignments", name="GET /students/me/assignments [setup]")
        if resp.status_code == 200:
            try:
                data = resp.json()
                items = data if isinstance(data, list) else data.get("items", data.get("assignments", []))
                if isinstance(items, list):
                    self._assignment_ids = [str(a["id"]) for a in items if a.get("id")]
                    self._not_started_ids = [
                        str(a["id"]) for a in items
                        if a.get("status") == "not_started"
                    ]
                    self._in_progress_ids = [
                        str(a["id"]) for a in items
                        if a.get("status") == "in_progress"
                    ]
            except Exception:
                pass

    # ── Reads ──────────────────────────────────────────────────

    @tag("core", "read")
    @task(5)
    def view_assignments(self):
        """Student checks their assignment list."""
        resp = self._get("/students/me/assignments", name="GET /students/me/assignments")
        if resp.status_code == 200:
            try:
                data = resp.json()
                items = data if isinstance(data, list) else data.get("items", data.get("assignments", []))
                if isinstance(items, list):
                    self._assignment_ids = [str(a["id"]) for a in items if a.get("id")][:20]
                    self._not_started_ids = [
                        str(a["id"]) for a in items if a.get("status") == "not_started"
                    ][:10]
                    self._in_progress_ids = [
                        str(a["id"]) for a in items if a.get("status") == "in_progress"
                    ][:10]
            except Exception:
                pass

    @tag("core", "read")
    @task(3)
    def view_progress(self):
        """Student checks their progress dashboard."""
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

    @tag("read")
    @task(2)
    def view_skill_profile(self):
        """Student views skill profile."""
        self._get("/students/me/skill-profile", name="GET /students/me/skill-profile")

    @tag("read")
    @task(1)
    def unread_message_count(self):
        """Student checks unread message count."""
        self._get("/messages/unread-count", name="GET /messages/unread-count")

    @tag("read")
    @task(1)
    def view_messages(self):
        """Student checks message conversations."""
        self._get("/messages/conversations", name="GET /messages/conversations")

    # ── Writes: Assignment Flow ────────────────────────────────

    @tag("core", "write")
    @task(3)
    def start_assignment(self):
        """Student starts a not_started assignment (changes status to in_progress)."""
        if not self._not_started_ids:
            # Fall back to any assignment
            if not self._assignment_ids:
                return
            assignment_id = random.choice(self._assignment_ids)
        else:
            assignment_id = random.choice(self._not_started_ids)

        resp = self._get(
            f"/assignments/{assignment_id}/students/me/start",
            name="GET /assignments/:id/students/me/start",
        )
        if resp.status_code == 200:
            # Move from not_started to in_progress
            if assignment_id in self._not_started_ids:
                self._not_started_ids.remove(assignment_id)
            if assignment_id not in self._in_progress_ids:
                self._in_progress_ids.append(assignment_id)

    @tag("core", "write")
    @task(2)
    def submit_assignment(self):
        """Student submits a completed assignment with realistic score."""
        if not self._in_progress_ids:
            return
        assignment_id = self._in_progress_ids.pop(0)

        score = round(random.gauss(70, 15), 1)  # Normal distribution around 70%
        score = max(0, min(100, score))
        time_spent = random.randint(3, 25)

        resp = self._post(
            f"/assignments/{assignment_id}/submit",
            name="POST /assignments/:id/submit",
            json={
                "answers_json": {
                    "answers": [
                        {"question_id": str(uuid.uuid4()), "answer": f"answer_{i}"}
                        for i in range(random.randint(3, 10))
                    ]
                },
                "score": score,
                "time_spent_minutes": time_spent,
            },
        )
        if resp.status_code == 200:
            # Successfully submitted — remove from tracking
            if assignment_id in self._assignment_ids:
                self._assignment_ids.remove(assignment_id)


# ─────────────────────────────────────────────────────────────
# Teacher: Reads + Assignment Creation
# ─────────────────────────────────────────────────────────────

class TeacherUser(LMSUser):
    """Simulates a teacher: manage classes, create assignments, check analytics."""

    weight = 3  # 30% of traffic
    wait_time = between(3, 10)  # Teachers spend more time reading
    role = "teacher"
    _class_ids: list[str]
    _student_ids: list[str]
    _created_assignment_ids: list[str]

    def on_start(self):
        if not self._login():
            raise StopUser()
        self._class_ids = []
        self._student_ids = []
        self._created_assignment_ids = []
        self._fetch_classes()
        self._fetch_students()

    def _fetch_classes(self):
        resp = self._get("/teachers/me/classes", name="GET /teachers/me/classes [setup]")
        if resp.status_code == 200:
            try:
                data = resp.json()
                classes = data if isinstance(data, list) else data.get("items", [])
                self._class_ids = [c["id"] for c in classes if c.get("id")]
            except Exception:
                pass

    def _fetch_students(self):
        resp = self._get("/teachers/me/students", name="GET /teachers/me/students [setup]")
        if resp.status_code == 200:
            try:
                data = resp.json()
                items = data.get("items", data.get("students", []))
                if isinstance(items, list):
                    self._student_ids = [s["id"] for s in items if s.get("id")]
            except Exception:
                pass

    # ── Reads ──────────────────────────────────────────────────

    @tag("core", "read")
    @task(5)
    def view_classes(self):
        self._get("/teachers/me/classes", name="GET /teachers/me/classes")

    @tag("core", "read")
    @task(3)
    def view_students(self):
        self._get("/teachers/me/students", name="GET /teachers/me/students")

    @tag("core", "read")
    @task(3)
    def view_assignments(self):
        self._get("/assignments/", name="GET /assignments [teacher]")

    @tag("read")
    @task(2)
    def list_books(self):
        self._get("/books", name="GET /books [teacher]")

    @tag("read")
    @task(1)
    def view_messages(self):
        self._get("/messages/conversations", name="GET /messages/conversations [teacher]")

    @tag("read")
    @task(1)
    def view_skills(self):
        self._get("/skills/", name="GET /skills")

    # ── Writes ─────────────────────────────────────────────────

    @tag("write")
    @task(2)
    def create_assignment(self):
        """Teacher creates an assignment assigned to a class."""
        if not self._class_ids or not self._student_ids or not ACTIVITY_IDS:
            return

        suffix = _random_suffix()
        # Pick a few random students
        selected = random.sample(self._student_ids, min(5, len(self._student_ids)))

        payload = {
            "source_type": "book",
            "book_id": DCS_BOOK_ID,
            "activity_id": random.choice(ACTIVITY_IDS),
            "name": f"LT Assignment {suffix}",
            "student_ids": [str(s) for s in selected],
        }
        # Add due date 50% of the time
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
                aid = resp.json().get("id")
                if aid:
                    self._created_assignment_ids.append(str(aid))
            except Exception:
                pass

    @tag("write")
    @task(1)
    def delete_created_assignment(self):
        """Clean up previously created assignments."""
        if not self._created_assignment_ids:
            return
        assignment_id = self._created_assignment_ids.pop(0)
        self._delete(
            f"/assignments/{assignment_id}",
            name="DELETE /assignments/:id [cleanup]",
        )

    @tag("write")
    @task(1)
    def send_message(self):
        """Teacher sends a message."""
        if not self._student_ids:
            return
        resp = self._get("/messages/recipients", name="GET /messages/recipients [for write]")
        if resp.status_code != 200:
            return
        try:
            recipients = resp.json().get("recipients", [])
            if not recipients:
                return
            recipient = random.choice(recipients)
            rid = recipient.get("id")
            if not rid:
                return
        except Exception:
            return

        self._post(
            "/messages",
            name="POST /messages [send]",
            json={
                "recipient_id": str(rid),
                "subject": f"Load test {_random_suffix()}",
                "body": "Automated load test message.",
            },
        )


# ─────────────────────────────────────────────────────────────
# Health Check (disabled by default)
# ─────────────────────────────────────────────────────────────

class HealthCheckUser(LMSUser):
    weight = 0
    wait_time = between(1, 3)

    def on_start(self):
        pass

    @task
    def health_check(self):
        self.client.get(f"{API}/utils/health-check/", name="GET /health-check")
