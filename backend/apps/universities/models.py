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
    
    # Additional fields
    scholarships_available = models.BooleanField(default=False)
    scholarships_description = models.TextField(blank=True)
    
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
    """University programs/majors"""
    
    DEGREE_TYPE_CHOICES = [
        ('bachelors', "Bachelor's"),
        ('masters', "Master's"),
        ('phd', 'PhD'),
        ('diploma', 'Diploma'),
        ('certificate', 'Certificate'),
    ]
    
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='programs')
    name = models.CharField(max_length=255)
    degree_type = models.CharField(max_length=20, choices=DEGREE_TYPE_CHOICES)
    duration_years = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    tuition_fee = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    intake_months = models.CharField(max_length=100, blank=True, help_text="e.g., January, September")
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
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
