from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'teams', views.TeamViewSet, basename='wc-team')
router.register(r'matches', views.MatchViewSet, basename='wc-match')
router.register(r'predictions', views.PredictionViewSet, basename='wc-prediction')
router.register(r'groups', views.WCGroupViewSet, basename='wc-group')

urlpatterns = [
    path('tournament-prediction/', views.tournament_prediction, name='wc-tournament-prediction'),
    path('tournament-result/', views.tournament_result, name='wc-tournament-result'),
    path('ranking-prediction/', views.ranking_prediction, name='wc-ranking-prediction'),
    path('ranking-result/', views.ranking_result, name='wc-ranking-result'),
    path('leaderboard/', views.leaderboard, name='wc-leaderboard'),
    path('points-config/', views.points_config, name='wc-points-config'),
    path('my-stats/', views.my_stats, name='wc-my-stats'),
    path('', include(router.urls)),
]
