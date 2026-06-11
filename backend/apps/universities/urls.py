from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'applications', views.ApplicationViewSet, basename='application')
router.register(r'programs', views.ProgramViewSet, basename='program')
router.register(r'', views.UniversityViewSet, basename='university')

urlpatterns = [
    path('apply/', views.apply_to_university, name='apply-to-university'),
    path('my/', views.my_universities, name='my-universities'),
    path('dashboard-stats/', views.dashboard_stats, name='dashboard-stats'),
    path('my-applications/', views.my_applications, name='my-applications'),
    path('applications/<int:pk>/withdraw/', views.withdraw_application, name='withdraw-application'),
    path('upload-excel/', views.upload_universities_excel, name='upload-universities-excel'),
    path('download-template/', views.download_template, name='download-template'),
    path('', include(router.urls)),
]
