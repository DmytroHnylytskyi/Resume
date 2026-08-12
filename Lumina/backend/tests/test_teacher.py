"""Asynchronous Integration Tests for Teacher Dashboard & Student Roster."""

import pytest


async def test_teacher_add_student_and_assign_course(client, teacher_token, student_user):
    """Verifies adding students to teacher roster, course creation and curriculum assignment."""
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # 1. Add student to teacher roster
    add_res = await client.post(
        "/teacher/students",
        json={"email": student_user.email},
        headers=teacher_headers,
    )
    assert add_res.status_code == 200
    assert add_res.json()["email"] == student_user.email

    # 2. Get students roster
    list_res = await client.get("/teacher/students", headers=teacher_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 3. Create a course as teacher
    course_res = await client.post(
        "/courses/",
        json={
            "title": "Python for Data Science",
            "description": "Learn numpy, pandas and visualization",
            "lessons": [{"title": "Setup", "content": "Install tools"}],
        },
        headers=teacher_headers,
    )
    assert course_res.status_code == 200
    course_id = course_res.json()["id"]

    # 4. Assign course to student
    assign_res = await client.post(
        "/teacher/assign",
        json={
            "student_id": student_user.id,
            "course_id": course_id,
            "deadlines": {},
        },
        headers=teacher_headers,
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["ok"] is True
    assert "id" in assign_res.json()
