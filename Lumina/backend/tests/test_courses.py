"""Asynchronous Integration Tests for Course Management, Media & Progress."""

import pytest


async def test_create_and_get_course(client, teacher_token):
    """Verifies end-to-end course creation, retrieval, lesson completion and student progress."""
    headers = {"Authorization": f"Bearer {teacher_token}"}
    course_payload = {
        "title": "FastAPI & React Masterclass",
        "description": "Comprehensive course on modern full-stack web applications.",
        "image_url": "https://example.com/cover.png",
        "lessons": [
            {
                "title": "Introduction to API Architecture",
                "content": "Lesson 1 notes",
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "attachments": ["https://example.com/notes.pdf"],
                "resource_type": "video",
            },
            {
                "title": "Database Design & Migrations",
                "content": "Lesson 2 notes",
                "video_url": "https://example.com/doc.pdf",
                "attachments": [],
                "resource_type": "pdf",
            },
        ],
    }

    # 1. Create personal self-study course
    personal_payload = {**course_payload, "is_personal": True}
    create_res = await client.post("/courses/", json=personal_payload, headers=headers)
    assert create_res.status_code == 200
    created_course = create_res.json()
    assert created_course["title"] == course_payload["title"]
    assert len(created_course["lessons"]) == 2
    course_id = created_course["id"]
    lesson_id = created_course["lessons"][0]["id"]

    # 2. Personal course appears in student panel, NOT in teacher library
    stud_res = await client.get("/courses/", headers=headers)
    assert stud_res.status_code == 200
    assert len(stud_res.json()) == 1

    lib_res = await client.get("/teacher/library", headers=headers)
    assert lib_res.status_code == 200
    assert len(lib_res.json()) == 0

    # 3. Create a teaching library course
    teach_payload = {**course_payload, "title": "Teacher Masterclass", "is_personal": False}
    teach_res = await client.post("/courses/", json=teach_payload, headers=headers)
    assert teach_res.status_code == 200

    lib_res2 = await client.get("/teacher/library", headers=headers)
    assert len(lib_res2.json()) == 1
    assert lib_res2.json()[0]["title"] == "Teacher Masterclass"

    # 3. Get single course by ID
    single_res = await client.get(f"/courses/{course_id}", headers=headers)
    assert single_res.status_code == 200
    assert single_res.json()["title"] == course_payload["title"]

    # 4. Mark lesson completed
    comp_res = await client.post(
        f"/courses/lessons/{lesson_id}/complete",
        json={"is_completed": True},
        headers=headers,
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["is_completed"] is True

    # 5. Check my-progress
    prog_res = await client.get("/courses/my-progress", headers=headers)
    assert prog_res.status_code == 200
    progress_data = prog_res.json()
    assert len(progress_data["progress"]) == 1
    assert progress_data["progress"][0]["lesson_id"] == lesson_id


async def test_file_upload_validation(client, teacher_token):
    """Verifies file upload security validation (allowed extensions vs malicious files)."""
    headers = {"Authorization": f"Bearer {teacher_token}"}

    # Disallowed extension (e.g. .exe)
    invalid_file = ("badfile.exe", b"malicious binary content", "application/x-msdownload")
    res = await client.post("/courses/upload", files={"file": invalid_file}, headers=headers)
    assert res.status_code == 400
    assert "not allowed" in res.json()["detail"]

    # Allowed extension (e.g. .txt)
    valid_file = ("notes.txt", b"Study guide notes content", "text/plain")
    res_valid = await client.post("/courses/upload", files={"file": valid_file}, headers=headers)
    assert res_valid.status_code == 200
    assert "url" in res_valid.json()
