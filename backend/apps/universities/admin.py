from django.contrib import admin
from .models import University, Program


class ProgramInline(admin.TabularInline):
    model = Program
    extra = 0
    fields = ['name', 'degree_type', 'course_location', 'beginning', 'duration_text', 'teaching_language', 'is_active']
    show_change_link = True


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ['name', 'country', 'city', 'university_type', 'ranking', 'is_active', 'created_at']
    list_filter = ['university_type', 'country', 'scholarships_available', 'is_active']
    search_fields = ['name', 'country', 'city']
    inlines = [ProgramInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'website', 'university_type')
        }),
        ('Location', {
            'fields': ('country', 'city', 'address')
        }),
        ('Admission Details', {
            'fields': ('deadline', 'application_fee', 'tuition_fee', 'admission_rate')
        }),
        ('Academic', {
            'fields': ('founded_year', 'ranking')
        }),
        ('Requirements', {
            'fields': ('ielts_score', 'toefl_score', 'gre_score', 'gmat_score')
        }),
        ('Scholarships', {
            'fields': ('scholarships_available', 'scholarships_description')
        }),
        ('Additional Info', {
            'fields': ('uniassist_required', 'remark')
        }),
        ('Contact', {
            'fields': ('email', 'phone')
        }),
        ('Status', {
            'fields': ('is_active', 'created_by')
        }),
    )
    readonly_fields = ['created_at', 'updated_at', 'created_by']

    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ['name', 'university', 'degree_type', 'course_location', 'teaching_language',
                    'beginning', 'duration_text', 'is_active']
    list_filter = ['degree_type', 'teaching_language', 'is_active']
    search_fields = ['name', 'university__name', 'course_location']
    fieldsets = (
        ('Core', {
            'fields': ('university', 'name', 'degree_type', 'duration_years', 'tuition_fee',
                       'intake_months', 'description', 'requirements', 'is_active')
        }),
        ('Application Info', {
            'fields': ('application_deadline', 'application_deadline_2', 'portal',
                       'application_submission_info', 'program_url')
        }),
        ('Course Details', {
            'fields': ('course_location', 'teaching_language', 'languages_description',
                       'duration_text', 'beginning', 'course_organisation', 'study_mode',
                       'mode_of_study', 'pace_of_course',
                       'integrated_internships', 'supervisor_student_ratio',
                       'additional_study_info', 'attendance_phases_in_germany',
                       'technical_equipment', 'certificates_for_modules',)
        }),
        ('International', {
            'fields': ('international_elements', 'integrated_german_courses',
                       'integrated_english_courses', 'study_abroad',
                       'other_international_elements', 'in_cooperation_with',
                       'diverse_background', 'international_support', 'general_services')
        }),
        ('Costs & Funding', {
            'fields': ('semester_contribution', 'costs_of_living', 'additional_tuition_info',
                       'funding_available', 'funding_description', 'special_funding',
                       'daad_funding_programme')
        }),
        ('Requirements', {
            'fields': ('academic_requirements', 'language_requirements')
        }),
        ('Student Life', {
            'fields': ('part_time_employment', 'accommodation_info', 'career_services')
        }),
        ('Other', {
            'fields': ('reason', 'current_information')
        }),
    )
