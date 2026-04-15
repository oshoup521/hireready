"""
generate_samples.py — Creates sample-resume.pdf and sample-jd.pdf
for the HireReady "Try with sample files" feature.
Run once: python generate_samples.py
Output files go to ../frontend/public/
"""

import fitz  # PyMuPDF
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
os.makedirs(OUT_DIR, exist_ok=True)

# ── Sample Resume ──────────────────────────────────────────────────────────────
RESUME_TEXT = """\
Alex Johnson
alex.johnson@email.com | +1 (555) 123-4567 | linkedin.com/in/alexjohnson | github.com/alexjohnson

SUMMARY
Results-driven software engineer with 4+ years of experience building scalable web
applications. Passionate about clean code, performance optimisation, and developer
experience.

EXPERIENCE

Senior Software Engineer — TechCorp, San Francisco, CA        2021 – Present
• Led migration of monolithic Node.js backend to microservices, reducing API
  latency by 40% and cutting infrastructure costs by $120K/year.
• Built a real-time analytics dashboard using React and WebSocket, serving
  5,000+ concurrent users.
• Mentored a team of 4 junior engineers; improved sprint velocity by 25%.
• Architected CI/CD pipeline with GitHub Actions and Docker, reducing
  deployment time from 45 minutes to under 8 minutes.

Software Engineer — StartupXYZ, Remote                        2019 – 2021
• Developed REST API endpoints in Python FastAPI for a SaaS product with
  10,000+ monthly active users.
• Integrated Stripe payment gateway, increasing conversion rate by 18%.
• Reduced database query time by 60% through PostgreSQL index optimisation.
• Implemented automated test suite (pytest) achieving 85% code coverage.

SKILLS
Programming: Python, JavaScript, TypeScript, Go, SQL
Frameworks: React, FastAPI, Node.js, Express, Django
Cloud & DevOps: AWS (EC2, S3, Lambda), Docker, Kubernetes, Terraform, Jenkins
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
Tools: Git, GitHub, JIRA, Figma

EDUCATION
B.Tech in Computer Science — State University, 2019
GPA: 3.8/4.0

PROJECTS
Open-Source CLI Tool (github.com/alexjohnson/devtool)
• Built a developer productivity CLI in Go used by 2,000+ developers worldwide.
• Reduced repetitive setup tasks by 70% through automation.

CERTIFICATIONS
• AWS Certified Solutions Architect – Associate (2022)
• Google Cloud Professional Data Engineer (2023)

ACHIEVEMENTS
• Winner, National Hackathon 2020 — "Best Technical Innovation"
• Published article on microservices scaling with 15,000 views on Medium.
"""

# ── Sample Job Description ─────────────────────────────────────────────────────
JD_TEXT = """\
Senior Software Engineer — FinTech Solutions Inc.

We are looking for a Senior Software Engineer to join our growing engineering team.
You will design, build, and maintain scalable backend services and collaborate
closely with product and design teams.

Responsibilities:
• Design and implement high-performance REST and GraphQL APIs.
• Lead technical architecture discussions and code reviews.
• Mentor junior engineers and contribute to engineering best practices.
• Collaborate with DevOps to manage CI/CD pipelines and cloud infrastructure.
• Optimise database performance and ensure system reliability at scale.

Requirements:
• 4+ years of software engineering experience.
• Strong proficiency in Python, JavaScript, or TypeScript.
• Experience with React or similar frontend frameworks.
• Hands-on experience with AWS, Docker, and Kubernetes.
• Proficiency with PostgreSQL or MongoDB.
• Familiarity with microservices architecture and REST APIs.
• Experience with agile/scrum development methodology.
• Strong communication and leadership skills.

Nice to Have:
• Experience with GraphQL.
• Knowledge of Redis or Elasticsearch.
• Contributions to open-source projects.
• AWS certification.

What We Offer:
• Competitive salary ($120K – $160K).
• Remote-first culture.
• Equity package.
• Learning & development budget.
"""


def make_pdf(text: str, out_path: str, title: str):
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)   # A4

    # Write text in a text box leaving margins
    rect = fitz.Rect(50, 50, 545, 800)
    page.insert_textbox(
        rect,
        text,
        fontsize=9,
        fontname="helv",
        color=(0, 0, 0),
        align=0,          # left align
    )

    doc.set_metadata({"title": title, "author": "HireReady Sample"})
    doc.save(out_path, garbage=4, deflate=True)
    doc.close()
    print(f"Created: {out_path}")


if __name__ == "__main__":
    make_pdf(RESUME_TEXT, os.path.join(OUT_DIR, "sample-resume.pdf"), "Sample Resume")
    make_pdf(JD_TEXT,     os.path.join(OUT_DIR, "sample-jd.pdf"),     "Sample Job Description")
    print("Done.")
