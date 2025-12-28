"""Generate Excel template for student bulk import testing."""
import random
from openpyxl import Workbook

# Sample data for realistic names
first_names = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Barbara", "David", "Elizabeth", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
    "Edward", "Deborah", "Ronald", "Stephanie", "Timothy", "Rebecca", "Jason", "Sharon"
]

last_names = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts"
]

grade_levels = ["5", "6", "7", "8", "9", "10", "11", "12"]

def generate_students(count: int) -> list[dict]:
    """Generate test student data."""
    students = []
    used_emails = set()

    for i in range(count):
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)

        # Ensure unique email
        counter = 0
        while True:
            email_base = f"{first_name.lower()}.{last_name.lower()}"
            if counter > 0:
                email_base += str(counter)
            email = f"{email_base}@teststudent.com"
            if email not in used_emails:
                used_emails.add(email)
                break
            counter += 1

        parent_email = f"parent.{email_base}@testparent.com"
        grade_level = random.choice(grade_levels)

        students.append({
            "First Name": first_name,
            "Last Name": last_name,
            "Email": email,
            "Grade Level": grade_level,
            "Parent Email": parent_email
        })

    return students

def create_excel_file(students: list[dict], filename: str):
    """Create Excel file with student data."""
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Students"

    # Write headers
    headers = ["First Name", "Last Name", "Email", "Grade Level", "Parent Email"]
    sheet.append(headers)

    # Style headers
    for cell in sheet[1]:
        cell.font = cell.font.copy(bold=True)

    # Write student data
    for student in students:
        sheet.append([
            student["First Name"],
            student["Last Name"],
            student["Email"],
            student["Grade Level"],
            student["Parent Email"]
        ])

    # Auto-adjust column widths
    for column in sheet.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        sheet.column_dimensions[column_letter].width = adjusted_width

    workbook.save(filename)
    print(f"✅ Created {filename} with {len(students)} students")

if __name__ == "__main__":
    # Generate 50 test students
    students = generate_students(50)

    # Create the Excel file
    create_excel_file(students, "student_bulk_import_50_users.xlsx")
