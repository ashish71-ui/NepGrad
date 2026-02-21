from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import University, Program, Application
from .serializers import UniversitySerializer, UniversityListSerializer, ProgramSerializer, ApplicationSerializer


class UniversityViewSet(viewsets.ModelViewSet):
    """ViewSet for University CRUD operations"""
    queryset = University.objects.all()
    serializer_class = UniversitySerializer
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return UniversityListSerializer
        return UniversitySerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [AllowAny()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def get_queryset(self):
        queryset = University.objects.filter(is_active=True)
        
        # Filter by country
        country = self.request.query_params.get('country')
        if country:
            queryset = queryset.filter(country__icontains=country)
        
        # Filter by city
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        # Filter by university type
        university_type = self.request.query_params.get('type')
        if university_type:
            queryset = queryset.filter(university_type=university_type)
        
        # Filter by scholarships
        scholarships = self.request.query_params.get('scholarships')
        if scholarships == 'true':
            queryset = queryset.filter(scholarships_available=True)
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        # Ordering
        ordering = self.request.query_params.get('ordering', 'name')
        if ordering:
            queryset = queryset.order_by(ordering)
        
        return queryset


class ApplicationViewSet(viewsets.ModelViewSet):
    """ViewSet for Application CRUD operations"""
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Application.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get user dashboard statistics"""
    user = request.user
    
    # Count universities user has applied to
    applied_count = Application.objects.filter(user=user).count()
    
    # Count universities user has added (only for admin/staff)
    added_count = 0
    if user.is_staff:
        added_count = University.objects.filter(created_by=user).count()
    
    # Get recent applications
    recent_applications = Application.objects.filter(user=user)[:5]
    applications_serializer = ApplicationSerializer(recent_applications, many=True)
    
    return Response({
        'applied_count': applied_count,
        'added_count': added_count,
        'recent_applications': applications_serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_to_university(request):
    """Apply to a university"""
    university_id = request.data.get('university_id')
    
    if not university_id:
        return Response(
            {'error': 'University ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        university = University.objects.get(pk=university_id, is_active=True)
    except University.DoesNotExist:
        return Response(
            {'error': 'University not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if already applied
    if Application.objects.filter(user=request.user, university=university).exists():
        return Response(
            {'error': 'You have already applied to this university'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    application = Application.objects.create(
        user=request.user,
        university=university,
        status='pending'
    )
    
    serializer = ApplicationSerializer(application)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_applications(request):
    """Get all applications for current user"""
    applications = Application.objects.filter(user=request.user)
    serializer = ApplicationSerializer(applications, many=True)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def withdraw_application(request, pk):
    """Withdraw an application"""
    try:
        application = Application.objects.get(pk=pk, user=request.user)
        application.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Application.DoesNotExist:
        return Response(
            {'error': 'Application not found'},
            status=status.HTTP_404_NOT_FOUND
        )


class ProgramViewSet(viewsets.ModelViewSet):
    """ViewSet for Program CRUD operations"""
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    permission_classes = [AllowAny]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [AllowAny()]
    
    def get_queryset(self):
        queryset = Program.objects.filter(is_active=True)
        
        # Filter by university
        university_id = self.request.query_params.get('university')
        if university_id:
            queryset = queryset.filter(university_id=university_id)
        
        # Filter by degree type
        degree_type = self.request.query_params.get('degree_type')
        if degree_type:
            queryset = queryset.filter(degree_type=degree_type)
        
        return queryset


@api_view(['GET'])
@permission_classes([AllowAny])
def university_detail(request, pk):
    """Get detailed university information with programs"""
    try:
        university = University.objects.get(pk=pk, is_active=True)
        serializer = UniversitySerializer(university)
        return Response(serializer.data)
    except University.DoesNotExist:
        return Response(
            {'error': 'University not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_universities(request):
    """Get universities added by current user (for admin)"""
    if not request.user.is_staff:
        return Response(
            {'error': 'You do not have permission to view this'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    universities = University.objects.filter(created_by=request.user)
    serializer = UniversityListSerializer(universities, many=True)
    return Response(serializer.data)
