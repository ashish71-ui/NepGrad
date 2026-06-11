from django.contrib import admin
from .models import Team, Match, Prediction, TournamentPrediction, TournamentResult, PointsConfig


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'flag', 'group']
    search_fields = ['name']
    ordering = ['group', 'name']


class PredictionInline(admin.TabularInline):
    model = Prediction
    extra = 0
    readonly_fields = ['user', 'home_score', 'away_score', 'points_earned']
    can_delete = False


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'match_time', 'stage', 'venue', 'is_completed', 'home_score', 'away_score']
    list_filter = ['stage', 'is_completed']
    search_fields = ['home_team__name', 'away_team__name', 'venue']
    inlines = [PredictionInline]
    ordering = ['match_time']


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ['user', 'match', 'home_score', 'away_score', 'points_earned']
    list_filter = ['match__stage']
    search_fields = ['user__username']


@admin.register(TournamentPrediction)
class TournamentPredictionAdmin(admin.ModelAdmin):
    list_display = ['user', 'predicted_winner', 'predicted_runner_up', 'points_earned', 'is_locked']


@admin.register(TournamentResult)
class TournamentResultAdmin(admin.ModelAdmin):
    list_display = ['winner', 'runner_up', 'is_final', 'updated_at']


@admin.register(PointsConfig)
class PointsConfigAdmin(admin.ModelAdmin):
    list_display = ['exact_score', 'correct_winner', 'correct_goal_difference',
                    'tournament_winner', 'tournament_runner_up', 'tournament_predictions_locked']
