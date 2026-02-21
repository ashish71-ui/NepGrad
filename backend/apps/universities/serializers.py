from rest_framework import serializers
from .models import University, Program, Application


class ProgramSerializer(serializers.ModelSerializer):
    """Serializer for Program model"""
    
    class Meta:
        model = Program
        fields = [
            'id', 'name', 'degree_type', 'duration_years', 'tuition_fee',
            'intake_months', 'description', 'requirements', 'is_active'
        ]
        read_only_fields = ['id', 'created_at']


class ApplicationSerializer(serializers.ModelSerializer):
    """Serializer for Application model"""
    university_name = serializers.SerializerMethodField()
    university_country = serializers.SerializerMethodField()
    university_city = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Application
        fields = [
            'id', 'university', 'university_name', 'university_country', 'university_city',
            'status', 'status_display', 'notes', 'applied_at', 'updated_at'
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
    """Serializer for University model"""
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
            'email', 'phone', 'is_active',
            'programs',
            'admission_rate_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_admission_rate_display(self, obj):
        if obj.admission_rate:
            return f"{obj.admission_rate}%"
        return None
    
    def get_university_type_display(self, obj):
        return obj.get_university_type_display()


class UniversityListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing universities"""
    admission_rate_display = serializers.SerializerMethodField()
    program_count = serializers.SerializerMethodField()
    
    class Meta:
        model = University
        fields = [
            'id', 'name', 'logo', 'country', 'city',
            'deadline', 'tuition_fee', 'admission_rate', 'admission_rate_display',
            'ranking', 'scholarships_available', 'is_active',
            'program_count', 'created_at'
        ]
    
    def get_admission_rate_display(self, obj):
        if obj.admission_rate:
            return f"{obj.admission_rate}%"
        return None
    
    def get_program_count(self, obj):
        return obj.programs.filter(is_active=True).count()
