from rest_framework import serializers
from .models import University, Program, Application


DAAD_FIELDS = [
    'reason', 'application_deadline', 'application_deadline_2', 'portal',
    'application_submission_info', 'program_url', 'course_location',
    'teaching_language', 'languages_description', 'duration_text', 'beginning',
    'course_organisation', 'international_elements', 'integrated_german_courses',
    'integrated_english_courses', 'semester_contribution', 'costs_of_living',
    'funding_available', 'funding_description', 'academic_requirements',
    'language_requirements', 'part_time_employment', 'accommodation_info',
    'career_services', 'international_support', 'study_mode',
    'integrated_internships', 'supervisor_student_ratio', 'additional_study_info',
    'general_services', 'study_abroad', 'current_information',
    'other_international_elements', 'in_cooperation_with', 'diverse_background',
    'special_funding', 'mode_of_study', 'daad_funding_programme', 'pace_of_course',
    'attendance_phases_in_germany', 'technical_equipment', 'certificates_for_modules',
    'additional_tuition_info',
]


class ProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = [
            'id', 'name', 'degree_type', 'duration_years', 'tuition_fee',
            'intake_months', 'description', 'requirements', 'is_active',
        ] + DAAD_FIELDS
        read_only_fields = ['id', 'created_at']


class ProgramListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing programs without DAAD detail fields."""
    class Meta:
        model = Program
        fields = [
            'id', 'name', 'degree_type', 'duration_years', 'tuition_fee',
            'intake_months', 'description', 'is_active', 'teaching_language',
            'beginning', 'course_location', 'duration_text', 'program_url',
        ]


class ApplicationSerializer(serializers.ModelSerializer):
    university_name = serializers.SerializerMethodField()
    university_country = serializers.SerializerMethodField()
    university_city = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'university', 'university_name', 'university_country', 'university_city',
            'status', 'status_display', 'notes', 'applied_at', 'updated_at',
        ]
        read_only_fields = ['id', 'applied_at', 'updated_at']

    def get_university_name(self, obj):
        return obj.university.name

    def get_university_country(self, obj):
        return obj.university.country

    def get_university_city(self, obj):
        return obj.university.city

    def get_status_display(self, obj):
        return obj.get_status_display()


class UniversitySerializer(serializers.ModelSerializer):
    programs = ProgramSerializer(many=True, read_only=True)
    admission_rate_display = serializers.SerializerMethodField()
    university_type_display = serializers.SerializerMethodField()

    class Meta:
        model = University
        fields = [
            'id', 'name', 'description', 'logo', 'website',
            'country', 'city', 'address',
            'deadline', 'application_fee', 'tuition_fee', 'admission_rate',
            'founded_year', 'university_type', 'university_type_display',
            'ranking', 'ielts_score', 'toefl_score', 'gre_score', 'gmat_score',
            'scholarships_available', 'scholarships_description',
            'uniassist_required', 'remark',
            'email', 'phone', 'is_active',
            'programs',
            'admission_rate_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_admission_rate_display(self, obj):
        if obj.admission_rate:
            return f"{obj.admission_rate}%"
        return None

    def get_university_type_display(self, obj):
        return obj.get_university_type_display()


class UniversityListSerializer(serializers.ModelSerializer):
    admission_rate_display = serializers.SerializerMethodField()
    program_count = serializers.SerializerMethodField()

    class Meta:
        model = University
        fields = [
            'id', 'name', 'logo', 'country', 'city',
            'deadline', 'tuition_fee', 'admission_rate', 'admission_rate_display',
            'ranking', 'scholarships_available', 'uniassist_required', 'is_active',
            'program_count', 'created_at',
        ]

    def get_admission_rate_display(self, obj):
        if obj.admission_rate:
            return f"{obj.admission_rate}%"
        return None

    def get_program_count(self, obj):
        return obj.programs.filter(is_active=True).count()


class ExcelUploadSerializer(serializers.Serializer):
    """Accepts an .xlsx file for bulk program import."""
    file = serializers.FileField()
    default_country = serializers.CharField(max_length=100, default='Germany', required=False)

    def validate_file(self, value):
        name = value.name.lower()
        if not (name.endswith('.xlsx') or name.endswith('.xls')):
            raise serializers.ValidationError("Only .xlsx or .xls files are supported.")
        return value
