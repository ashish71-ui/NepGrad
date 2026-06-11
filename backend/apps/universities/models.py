from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class University(models.Model):
    """University model with admission-related information"""

    # Basic Information
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='university_logos/', blank=True, null=True)
    website = models.URLField(blank=True)

    # Location
    country = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    address = models.TextField(blank=True)

    # Admission Details
    deadline = models.DateField(null=True, blank=True)
    application_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tuition_fee = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    admission_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Admission rate in percentage")

    # Academic Information
    founded_year = models.IntegerField(null=True, blank=True)
    university_type = models.CharField(max_length=50, choices=[
        ('public', 'Public'),
        ('private', 'Private'),
        ('government', 'Government'),
    ], default='private')
    ranking = models.IntegerField(null=True, blank=True, help_text="World ranking")

    # Requirements
    ielts_score = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    toefl_score = models.IntegerField(null=True, blank=True)
    gre_score = models.IntegerField(null=True, blank=True)
    gmat_score = models.IntegerField(null=True, blank=True)

    # Scholarships
    scholarships_available = models.BooleanField(default=False)
    scholarships_description = models.TextField(blank=True)

    # UniAssist & Additional Info
    uniassist_required = models.BooleanField(default=False, help_text="Whether UniAssist evaluation is required")
    remark = models.TextField(blank=True, help_text="Additional remarks or notes about the university")

    # Contact
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # Status
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='universities_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'universities'
        verbose_name = 'University'
        verbose_name_plural = 'Universities'
        ordering = ['name']

    def __str__(self):
        return self.name


class Program(models.Model):
    """University programs/courses — supports both manual entry and DAAD Excel import"""

    DEGREE_TYPE_CHOICES = [
        ('bachelors', "Bachelor's"),
        ('masters', "Master's"),
        ('phd', 'PhD'),
        ('diploma', 'Diploma'),
        ('certificate', 'Certificate'),
        ('other', 'Other'),
    ]

    # ── Core fields ──────────────────────────────────────────────────────────
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='programs')
    name = models.CharField(max_length=500)
    degree_type = models.CharField(max_length=100, choices=DEGREE_TYPE_CHOICES, blank=True)
    duration_years = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    tuition_fee = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    intake_months = models.CharField(max_length=255, blank=True, help_text="e.g., January, September")
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # ── DAAD / Excel import fields ────────────────────────────────────────────
    # Maps to Excel col: 'reason'
    reason = models.CharField(max_length=100, blank=True)
    # Maps to Excel col: 'Application deadline'
    application_deadline = models.TextField(blank=True)
    # Maps to Excel col: 'application deadline 2'
    application_deadline_2 = models.TextField(blank=True)
    # Maps to Excel col: 'portal'
    portal = models.CharField(max_length=500, blank=True)
    # Maps to Excel col: 'Submit application to'
    application_submission_info = models.TextField(blank=True)
    # Maps to Excel col: 'URL'
    program_url = models.CharField(max_length=500, blank=True)
    # Maps to Excel col: 'Course location'
    course_location = models.CharField(max_length=255, blank=True)
    # Maps to Excel col: 'Teaching language'
    teaching_language = models.CharField(max_length=100, blank=True)
    # Maps to Excel col: 'Languages'
    languages_description = models.TextField(blank=True)
    # Maps to Excel col: 'Programme duration' (text form, e.g. "4 semesters")
    duration_text = models.CharField(max_length=100, blank=True)
    # Maps to Excel col: 'Beginning' (e.g. "Winter and summer semester")
    beginning = models.CharField(max_length=255, blank=True)
    # Maps to Excel col: 'Course organisation'
    course_organisation = models.TextField(blank=True)
    # Maps to Excel col: 'International elements'
    international_elements = models.TextField(blank=True)
    # Maps to Excel col: 'Course-specific, integrated German language courses'
    integrated_german_courses = models.CharField(max_length=255, blank=True)
    # Maps to Excel col: 'Course-specific, integrated English language courses'
    integrated_english_courses = models.CharField(max_length=255, blank=True)
    # Maps to Excel col: 'Semester contribution'
    semester_contribution = models.TextField(blank=True)
    # Maps to Excel col: 'Costs of living'
    costs_of_living = models.TextField(blank=True)
    # Maps to Excel col: 'Funding opportunities within the university' (Yes/No text)
    funding_available = models.CharField(max_length=50, blank=True)
    # Maps to Excel col: 'Description of the above-mentioned funding opportunities within the university'
    funding_description = models.TextField(blank=True)
    # Maps to Excel col: 'Academic admission requirements'
    academic_requirements = models.TextField(blank=True)
    # Maps to Excel col: 'Language requirements'
    language_requirements = models.TextField(blank=True)
    # Maps to Excel col: 'Possibility of finding part-time employment'
    part_time_employment = models.TextField(blank=True)
    # Maps to Excel col: 'Accommodation'
    accommodation_info = models.TextField(blank=True)
    # Maps to Excel col: 'Career advisory services and programmes for future professionals'
    career_services = models.TextField(blank=True)
    # Maps to Excel col: 'Support for international students and doctoral candidates'
    international_support = models.TextField(blank=True)
    # Maps to Excel col: 'Full-time / part-time'
    study_mode = models.CharField(max_length=100, blank=True)
    # Maps to Excel col: 'Integrated internships'
    integrated_internships = models.CharField(max_length=255, blank=True)
    # Maps to Excel col: 'Supervisor-student ratio'
    supervisor_student_ratio = models.CharField(max_length=100, blank=True)
    # Maps to Excel col: 'Additional information on beginning, duration and mode of study'
    additional_study_info = models.TextField(blank=True)
    # Maps to Excel col: 'General services and support for international students and doctoral candidates'
    general_services = models.TextField(blank=True)
    # Maps to Excel col: 'Integrated/optional study abroad unit(s)'
    study_abroad = models.TextField(blank=True)
    # Maps to Excel col: 'Current information'
    current_information = models.TextField(blank=True)
    # Maps to Excel col: 'Description of other international elements'
    other_international_elements = models.TextField(blank=True)
    # Maps to Excel col: 'In cooperation with'
    in_cooperation_with = models.TextField(blank=True)
    # Maps to Excel col: 'Diverse intercultural background of students'
    diverse_background = models.TextField(blank=True)
    # Maps to Excel col: 'Special promotion / funding of the programme'
    special_funding = models.TextField(blank=True)
    # Maps to Excel col: 'Mode of study'
    mode_of_study = models.CharField(max_length=100, blank=True)
    # Maps to Excel col: 'Name of DAAD funding programme'
    daad_funding_programme = models.CharField(max_length=255, blank=True)
    # Maps to Excel col: 'Pace of course'
    pace_of_course = models.CharField(max_length=100, blank=True)
    # Maps to Excel col: 'Phase(s) of attendance in Germany (applies to the entire programme)'
    attendance_phases_in_germany = models.TextField(blank=True)
    # Maps to Excel col: 'Technical equipment and programmes'
    technical_equipment = models.TextField(blank=True)
    # Maps to Excel col: 'Certificates for specific modules are awarded'
    certificates_for_modules = models.TextField(blank=True)
    # Maps to Excel col: 'Additional information on tuition fees'
    additional_tuition_info = models.TextField(blank=True)

    class Meta:
        db_table = 'programs'
        verbose_name = 'Program'
        verbose_name_plural = 'Programs'
        ordering = ['name']

    def __str__(self):
        return f"{self.university.name} - {self.name}"


class Application(models.Model):
    """Track user's university applications"""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('waitlisted', 'Waitlisted'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'applications'
        verbose_name = 'Application'
        verbose_name_plural = 'Applications'
        unique_together = [['user', 'university']]
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.user.email} - {self.university.name}"
