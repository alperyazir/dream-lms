"""PDF report generator using reportlab - Story 5.6."""

import logging
from datetime import datetime

from reportlab.lib import colors

logger = logging.getLogger(__name__)
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing, String
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Register Unicode-compatible fonts for international characters (e.g., Turkish)
# Try multiple font paths for different operating systems
FONT_PATHS = [
    # macOS Arial (supports Turkish characters)
    ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    # macOS DejaVu (if installed)
    ("/System/Library/Fonts/Supplemental/DejaVuSans.ttf", "/System/Library/Fonts/Supplemental/DejaVuSans-Bold.ttf"),
    # Linux common paths
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    # Ubuntu/Debian
    ("/usr/share/fonts/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
    # Linux Arial
    ("/usr/share/fonts/truetype/msttcorefonts/Arial.ttf", "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf"),
]

UNICODE_FONT = "Helvetica"  # Default fallback
UNICODE_FONT_BOLD = "Helvetica-Bold"
FONT_NAME_REGISTERED = "CustomFont"  # Name we'll use for the registered font

logger.info("DEBUG PDF FONTS: Starting font registration")
for regular_path, bold_path in FONT_PATHS:
    try:
        from pathlib import Path
        logger.info(f"DEBUG PDF FONTS: Trying {regular_path}")
        if Path(regular_path).exists() and Path(bold_path).exists():
            logger.info(f"DEBUG PDF FONTS: Found fonts at {regular_path}")
            pdfmetrics.registerFont(TTFont(FONT_NAME_REGISTERED, regular_path))
            pdfmetrics.registerFont(TTFont(f"{FONT_NAME_REGISTERED}-Bold", bold_path))
            UNICODE_FONT = FONT_NAME_REGISTERED
            UNICODE_FONT_BOLD = f"{FONT_NAME_REGISTERED}-Bold"
            logger.info(f"DEBUG PDF FONTS: Successfully registered font from {regular_path}")
            break
        else:
            logger.info(f"DEBUG PDF FONTS: Not found at {regular_path}")
    except Exception as e:
        logger.error(f"DEBUG PDF FONTS: Error with {regular_path}: {e}")
        continue  # Try next path

logger.info(f"DEBUG PDF FONTS: Using font={UNICODE_FONT}, bold={UNICODE_FONT_BOLD}")

# Template type display names
TEMPLATE_NAMES = {
    "weekly_class_summary": "Weekly Class Summary",
    "student_progress_report": "Student Progress Report",
    "monthly_assignment_overview": "Monthly Assignment Overview",
    "parent_teacher_conference": "Parent-Teacher Conference Report",
}

# Report type display names
REPORT_TYPE_NAMES = {
    "student": "Student Report",
    "class": "Class Report",
    "assignment": "Assignment Overview",
}


def generate_pdf_report(
    data: dict,
    report_type: str,
    template_type: str | None,
    output_path: str,
) -> None:
    """
    Generate a PDF report from report data.

    Args:
        data: Report data dictionary
        report_type: Type of report (student, class, assignment)
        template_type: Optional template type
        output_path: Path to write PDF file
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    # Build the story (list of flowables)
    story = []
    styles = getSampleStyleSheet()

    # Custom styles with Unicode font support
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontName=UNICODE_FONT_BOLD,
        fontSize=24,
        spaceAfter=12,
        alignment=1,  # Center
    )

    subtitle_style = ParagraphStyle(
        "CustomSubtitle",
        parent=styles["Normal"],
        fontName=UNICODE_FONT,
        fontSize=12,
        textColor=colors.grey,
        alignment=1,
        spaceAfter=6,
    )

    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontName=UNICODE_FONT_BOLD,
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor("#1a365d"),
    )

    body_style = ParagraphStyle(
        "CustomBody",
        parent=styles["Normal"],
        fontName=UNICODE_FONT,
        fontSize=10,
        spaceAfter=8,
        leading=14,
    )

    # Create cover page
    story.extend(
        _create_cover_page(
            data, report_type, template_type, title_style, subtitle_style, body_style
        )
    )
    story.append(PageBreak())

    # Create summary section
    story.extend(_create_summary_section(data, heading_style, body_style))

    # Create trend section
    story.extend(_create_trend_section(data, heading_style, body_style))

    # Create appropriate data sections based on report type
    if report_type == "student":
        story.extend(_create_student_sections(data, heading_style, body_style, styles))
    elif report_type == "class":
        story.extend(_create_class_sections(data, heading_style, body_style, styles))
    else:  # assignment
        story.extend(_create_assignment_sections(data, heading_style, body_style, styles))

    # Add narrative summary
    story.extend(_create_narrative_section(data, heading_style, body_style))

    # Build PDF
    doc.build(story, onFirstPage=_add_footer, onLaterPages=_add_footer)


def _add_footer(canvas, doc):
    """Add footer with page number and generation date."""
    canvas.saveState()
    canvas.setFont(UNICODE_FONT, 8)
    canvas.setFillColor(colors.grey)

    # Page number
    page_num = f"Page {doc.page}"
    canvas.drawRightString(letter[0] - 0.75 * inch, 0.5 * inch, page_num)

    # Generation date
    date_str = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    canvas.drawString(0.75 * inch, 0.5 * inch, date_str)

    canvas.restoreState()


def _create_cover_page(
    data: dict,
    report_type: str,
    template_type: str | None,
    title_style,
    subtitle_style,
    body_style,
) -> list:
    """Create cover page elements."""
    elements = []

    # Spacer for vertical centering
    elements.append(Spacer(1, 2 * inch))

    # Title
    if template_type and template_type in TEMPLATE_NAMES:
        title = TEMPLATE_NAMES[template_type]
    else:
        title = REPORT_TYPE_NAMES.get(report_type, "Report")

    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 0.5 * inch))

    # Subject info
    if report_type == "student":
        elements.append(
            Paragraph(f"Student: {data.get('student_name', 'Unknown')}", subtitle_style)
        )
        elements.append(
            Paragraph(f"Class: {data.get('class_name', 'N/A')}", subtitle_style)
        )
    elif report_type == "class":
        elements.append(
            Paragraph(f"Class: {data.get('class_name', 'Unknown')}", subtitle_style)
        )
        elements.append(
            Paragraph(f"Teacher: {data.get('teacher_name', 'N/A')}", subtitle_style)
        )
    else:
        elements.append(
            Paragraph(f"Teacher: {data.get('teacher_name', 'Unknown')}", subtitle_style)
        )

    elements.append(Spacer(1, 0.3 * inch))

    # Date range
    period_start = data.get("period_start", "")
    period_end = data.get("period_end", "")
    elements.append(
        Paragraph(f"Period: {period_start} to {period_end}", subtitle_style)
    )

    elements.append(Spacer(1, 2 * inch))

    # Footer info on cover
    elements.append(
        Paragraph("Dream LMS Analytics Report", body_style)
    )

    return elements


def _create_summary_section(data: dict, heading_style, body_style) -> list:
    """Create summary statistics section."""
    elements = []

    elements.append(Paragraph("Summary Statistics", heading_style))

    summary = data.get("summary", {})
    if isinstance(summary, dict):
        summary_data = [
            ["Metric", "Value"],
            ["Average Score", f"{summary.get('avg_score', 0):.1f}%"],
            ["Total Completed", str(summary.get("total_completed", 0))],
            [
                "Completion Rate",
                f"{summary.get('completion_rate', 0) * 100:.0f}%",
            ],
            ["Total Assigned", str(summary.get("total_assigned", 0))],
        ]

        table = Table(summary_data, colWidths=[3 * inch, 2 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c5282")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), UNICODE_FONT_BOLD),
                    ("FONTNAME", (0, 1), (-1, -1), UNICODE_FONT),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f7fafc")),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("PADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        elements.append(table)

    elements.append(Spacer(1, 0.3 * inch))

    return elements


def _create_trend_section(data: dict, heading_style, body_style) -> list:
    """Create trend analysis section."""
    elements = []

    trend = data.get("trend", {})
    if not trend:
        return elements

    elements.append(Paragraph("Trend Analysis", heading_style))

    if isinstance(trend, dict):
        direction = trend.get("direction", "new")
        change = trend.get("change")
        current = trend.get("current", 0)
        previous = trend.get("previous")

        if direction == "up":
            trend_text = f"Performance <b>improved by {abs(change):.1f}%</b> compared to the previous period."
            trend_color = colors.HexColor("#276749")
        elif direction == "down":
            trend_text = f"Performance <b>decreased by {abs(change):.1f}%</b> compared to the previous period."
            trend_color = colors.HexColor("#c53030")
        elif direction == "stable":
            trend_text = "Performance <b>remained stable</b> compared to the previous period."
            trend_color = colors.HexColor("#2b6cb0")
        else:
            trend_text = "This is the <b>first reporting period</b> with available data."
            trend_color = colors.HexColor("#718096")

        trend_style = ParagraphStyle(
            "TrendStyle",
            parent=body_style,
            textColor=trend_color,
            fontSize=11,
        )
        elements.append(Paragraph(trend_text, trend_style))

        # Comparison values
        if previous is not None:
            elements.append(Spacer(1, 0.1 * inch))
            comparison_data = [
                ["Current Period", "Previous Period", "Change"],
                [
                    f"{current:.1f}%",
                    f"{previous:.1f}%",
                    f"{change:+.1f}%" if change else "N/A",
                ],
            ]

            table = Table(comparison_data, colWidths=[2 * inch, 2 * inch, 1.5 * inch])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4a5568")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), UNICODE_FONT_BOLD),
                        ("FONTNAME", (0, 1), (-1, -1), UNICODE_FONT),
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                        ("PADDING", (0, 0), (-1, -1), 8),
                    ]
                )
            )
            elements.append(table)

    elements.append(Spacer(1, 0.3 * inch))

    return elements


def _create_skill_chart(skill_breakdown: list[dict], width: float = 460, height: float = 220) -> Drawing:
    """Create a bar chart for skill performance."""
    drawing = Drawing(width, height)

    chart = VerticalBarChart()
    chart.x = 50
    chart.y = 30
    chart.width = width - 80
    chart.height = height - 60

    labels = [item.get("skill_name", "?") for item in skill_breakdown]
    scores = [item.get("avg_score", 0) for item in skill_breakdown]

    chart.data = [scores]
    chart.categoryAxis.categoryNames = labels
    chart.categoryAxis.labels.angle = 0
    chart.categoryAxis.labels.fontSize = 8
    chart.categoryAxis.labels.fontName = UNICODE_FONT
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 100
    chart.valueAxis.valueStep = 20
    chart.valueAxis.labels.fontSize = 8
    chart.valueAxis.labels.fontName = UNICODE_FONT

    # Bar styling
    chart.bars[0].fillColor = colors.HexColor("#3b5998")
    chart.bars[0].strokeColor = colors.HexColor("#2d4373")
    chart.barWidth = 24
    chart.groupSpacing = 10

    # Score labels on top of bars
    chart.barLabelFormat = "%.0f%%"
    chart.barLabels.fontSize = 7
    chart.barLabels.nudge = 6

    # Title
    title = String(width / 2, height - 12, "Skill Performance", textAnchor="middle", fontSize=11, fontName=UNICODE_FONT_BOLD)
    drawing.add(title)
    drawing.add(chart)

    return drawing


def _create_student_sections(data: dict, heading_style, body_style, styles) -> list:
    """Create student-specific report sections."""
    elements = []

    # Skill breakdown chart + table
    skill_breakdown = data.get("skill_breakdown", [])
    if skill_breakdown:
        # Chart
        chart = _create_skill_chart(skill_breakdown)
        elements.append(chart)
        elements.append(Spacer(1, 0.2 * inch))

        # Table
        elements.append(Paragraph("Skill Details", heading_style))
        table_data = [["Skill", "Average Score", "Assignments"]]
        for item in skill_breakdown:
            table_data.append([
                item.get("skill_name", "Unknown"),
                f"{item.get('avg_score', 0):.1f}%",
                str(item.get("count", 0)),
            ])

        table = _create_data_table(table_data, [3 * inch, 1.5 * inch, 1.5 * inch])
        elements.append(table)
        elements.append(Spacer(1, 0.3 * inch))

    # Assignment list
    assignments = data.get("assignments", [])
    if assignments:
        elements.append(Paragraph("Assignment Details", heading_style))

        table_data = [["Assignment", "Score", "Time Spent", "Completed"]]
        for item in assignments[:15]:  # Limit to 15 items
            table_data.append([
                item.get("name", "Unknown")[:40],
                f"{item.get('score', 0)}%",
                f"{item.get('time_spent', 0)} min",
                item.get("completed_at", "")[:10] if item.get("completed_at") else "N/A",
            ])

        table = _create_data_table(
            table_data, [3 * inch, 1 * inch, 1 * inch, 1.5 * inch]
        )
        elements.append(table)

    return elements


def _create_class_sections(data: dict, heading_style, body_style, styles) -> list:
    """Create class-specific report sections."""
    elements = []

    # Score distribution
    score_distribution = data.get("score_distribution", [])
    if score_distribution:
        elements.append(Paragraph("Score Distribution", heading_style))

        table_data = [["Score Range", "Number of Students"]]
        for bucket in score_distribution:
            table_data.append([
                bucket.get("range_label", "Unknown"),
                str(bucket.get("count", 0)),
            ])

        table = _create_data_table(table_data, [3 * inch, 2 * inch])
        elements.append(table)
        elements.append(Spacer(1, 0.3 * inch))

    # Top students
    top_students = data.get("top_students", [])
    if top_students:
        elements.append(Paragraph("Top Performing Students", heading_style))

        table_data = [["Rank", "Student", "Average Score"]]
        for student in top_students:
            table_data.append([
                str(student.get("rank", "")),
                student.get("name", "Unknown"),
                f"{student.get('avg_score', 0):.1f}%",
            ])

        table = _create_data_table(table_data, [1 * inch, 3 * inch, 1.5 * inch])
        elements.append(table)
        elements.append(Spacer(1, 0.3 * inch))

    # Struggling students
    struggling_students = data.get("struggling_students", [])
    if struggling_students:
        elements.append(Paragraph("Students Needing Support", heading_style))

        table_data = [["Student", "Average Score", "Alert"]]
        for student in struggling_students:
            table_data.append([
                student.get("name", "Unknown"),
                f"{student.get('avg_score', 0):.1f}%",
                student.get("alert_reason", ""),
            ])

        table = _create_data_table(table_data, [2 * inch, 1.5 * inch, 2.5 * inch])
        elements.append(table)
        elements.append(Spacer(1, 0.3 * inch))

    # Skill breakdown chart + table
    skill_breakdown = data.get("skill_breakdown", [])
    if skill_breakdown:
        # Chart
        chart = _create_skill_chart(skill_breakdown)
        elements.append(chart)
        elements.append(Spacer(1, 0.2 * inch))

        # Table
        elements.append(Paragraph("Skill Details", heading_style))
        table_data = [["Skill", "Average Score", "Assignments"]]
        for item in skill_breakdown:
            table_data.append([
                item.get("skill_name", "Unknown"),
                f"{item.get('avg_score', 0):.1f}%",
                str(item.get("count", 0)),
            ])

        table = _create_data_table(table_data, [3 * inch, 1.5 * inch, 1.5 * inch])
        elements.append(table)

    return elements


def _create_assignment_sections(data: dict, heading_style, body_style, styles) -> list:
    """Create assignment overview report sections."""
    elements = []

    # Assignment metrics
    assignments = data.get("assignments", [])
    if assignments:
        elements.append(Paragraph("Assignment Performance", heading_style))

        table_data = [["Assignment", "Avg Score", "Completion", "Avg Time"]]
        for item in assignments[:20]:  # Limit to 20
            table_data.append([
                item.get("name", "Unknown")[:35],
                f"{item.get('avg_score', 0):.1f}%",
                f"{item.get('completion_rate', 0) * 100:.0f}%",
                f"{item.get('time_spent', 0):.0f} min",
            ])

        table = _create_data_table(
            table_data, [2.5 * inch, 1.25 * inch, 1.25 * inch, 1.25 * inch]
        )
        elements.append(table)
        elements.append(Spacer(1, 0.3 * inch))

    # Most successful
    most_successful = data.get("most_successful", [])
    if most_successful:
        elements.append(Paragraph("Most Successful Assignments", heading_style))

        table_data = [["Assignment", "Average Score"]]
        for item in most_successful:
            table_data.append([
                item.get("name", "Unknown"),
                f"{item.get('avg_score', 0):.1f}%",
            ])

        table = _create_data_table(table_data, [4 * inch, 2 * inch])
        elements.append(table)
        elements.append(Spacer(1, 0.3 * inch))

    # Least successful
    least_successful = data.get("least_successful", [])
    if least_successful:
        elements.append(Paragraph("Assignments Needing Attention", heading_style))

        table_data = [["Assignment", "Average Score"]]
        for item in least_successful:
            table_data.append([
                item.get("name", "Unknown"),
                f"{item.get('avg_score', 0):.1f}%",
            ])

        table = _create_data_table(table_data, [4 * inch, 2 * inch])
        elements.append(table)
        elements.append(Spacer(1, 0.3 * inch))

    # Activity type comparison
    activity_comparison = data.get("activity_type_comparison", [])
    if activity_comparison:
        elements.append(Paragraph("Performance by Activity Type", heading_style))

        table_data = [["Activity Type", "Average Score", "Count"]]
        for item in activity_comparison:
            table_data.append([
                item.get("label", item.get("activity_type", "Unknown")),
                f"{item.get('avg_score', 0):.1f}%",
                str(item.get("count", 0)),
            ])

        table = _create_data_table(table_data, [3 * inch, 1.5 * inch, 1.5 * inch])
        elements.append(table)

    return elements


def _create_narrative_section(data: dict, heading_style, body_style) -> list:
    """Create narrative summary section."""
    elements = []

    narrative = data.get("narrative", "")
    if narrative:
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(Paragraph("Summary & Recommendations", heading_style))

        # Style for narrative box
        narrative_style = ParagraphStyle(
            "NarrativeStyle",
            parent=body_style,
            fontSize=11,
            leading=16,
            leftIndent=10,
            rightIndent=10,
            spaceBefore=10,
            spaceAfter=10,
        )
        elements.append(Paragraph(narrative, narrative_style))

    return elements


def _create_data_table(data: list, col_widths: list) -> Table:
    """Create a styled data table."""
    table = Table(data, colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c5282")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                ("FONTNAME", (0, 0), (-1, 0), UNICODE_FONT_BOLD),
                ("FONTNAME", (0, 1), (-1, -1), UNICODE_FONT),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                ("TOPPADDING", (0, 0), (-1, 0), 10),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table
