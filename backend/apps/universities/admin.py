from django.contrib import admin
from .models import University, Program


class ProgramInline(admin.TabularInline):
    model = Program
    extra = 1
    fields = ['name', 'degree_type', 'duration_years', 'tuition_fee', 'intake_months', 'is_active']


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
    list_display = ['name', 'university', 'degree_type', 'duration_years', 'tuition_fee', 'is_active']
    list_filter = ['degree_type', 'is_active']
    search_fields = ['name', 'university__name']
