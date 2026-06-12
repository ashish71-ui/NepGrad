from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    WCGroup, Team, Match, Prediction,
    TournamentPrediction, TournamentResult, PointsConfig,
    TeamRankingPrediction, TeamRankingResult,
)

User = get_user_model()


class WCGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = WCGroup
        fields = ['id', 'name', 'code', 'created_by_username', 'member_count', 'created_at']
        read_only_fields = ['code', 'created_by_username', 'member_count', 'created_at']

    def get_member_count(self, obj):
        return obj.members.count()


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'name', 'flag', 'group']


class MatchSerializer(serializers.ModelSerializer):
    home_team = TeamSerializer(read_only=True)
    away_team = TeamSerializer(read_only=True)
    home_team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='home_team', write_only=True
    )
    away_team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='away_team', write_only=True
    )
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    is_locked = serializers.BooleanField(read_only=True)
    result_label = serializers.CharField(source='get_result_label', read_only=True)

    class Meta:
        model = Match
        fields = [
            'id', 'home_team', 'away_team', 'home_team_id', 'away_team_id',
            'match_time', 'stage', 'stage_display', 'venue', 'match_number',
            'home_score', 'away_score', 'is_completed', 'is_locked',
            'result_label', 'created_at',
        ]


class PredictionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    match = MatchSerializer(read_only=True)
    match_id = serializers.PrimaryKeyRelatedField(
        queryset=Match.objects.all(), source='match', write_only=True
    )

    class Meta:
        model = Prediction
        fields = [
            'id', 'user', 'match', 'match_id',
            'home_score', 'away_score', 'points_earned',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['points_earned']

    def validate(self, data):
        match = data.get('match') or (self.instance.match if self.instance else None)
        if match and match.is_locked:
            raise serializers.ValidationError('Predictions are locked once the match starts.')
        if data.get('home_score', 0) < 0 or data.get('away_score', 0) < 0:
            raise serializers.ValidationError('Scores cannot be negative.')
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        match = validated_data['match']
        prediction, _ = Prediction.objects.update_or_create(
            user=user, match=match,
            defaults={
                'home_score': validated_data['home_score'],
                'away_score': validated_data['away_score'],
            }
        )
        return prediction


class TournamentPredictionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    predicted_winner = TeamSerializer(read_only=True)
    predicted_runner_up = TeamSerializer(read_only=True)
    predicted_winner_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='predicted_winner', write_only=True, allow_null=True
    )
    predicted_runner_up_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='predicted_runner_up', write_only=True, allow_null=True
    )

    class Meta:
        model = TournamentPrediction
        fields = [
            'id', 'user',
            'predicted_winner', 'predicted_winner_id',
            'predicted_runner_up', 'predicted_runner_up_id',
            'points_earned', 'is_locked',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['points_earned', 'is_locked']

    def validate(self, data):
        config = PointsConfig.objects.first()
        if config and config.tournament_predictions_locked:
            raise serializers.ValidationError('Tournament predictions are locked.')
        winner = data.get('predicted_winner')
        runner_up = data.get('predicted_runner_up')
        if winner and runner_up and winner == runner_up:
            raise serializers.ValidationError('Winner and runner-up cannot be the same team.')
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        prediction, _ = TournamentPrediction.objects.update_or_create(
            user=user,
            defaults={
                'predicted_winner': validated_data.get('predicted_winner'),
                'predicted_runner_up': validated_data.get('predicted_runner_up'),
            }
        )
        return prediction


class TournamentResultSerializer(serializers.ModelSerializer):
    winner = TeamSerializer(read_only=True)
    runner_up = TeamSerializer(read_only=True)
    winner_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='winner', write_only=True, allow_null=True
    )
    runner_up_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='runner_up', write_only=True, allow_null=True
    )

    class Meta:
        model = TournamentResult
        fields = ['id', 'winner', 'winner_id', 'runner_up', 'runner_up_id', 'is_final', 'updated_at']


class PointsConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsConfig
        fields = [
            'id', 'exact_score', 'correct_winner', 'correct_goal_difference',
            'tournament_winner', 'tournament_runner_up',
            'tournament_predictions_locked',
            'ranking_top3_each', 'ranking_correct_first', 'ranking_correct_second',
            'ranking_final_exact', 'ranking_final_one_score', 'ranking_final_diff_winner',
            'ranking_predictions_locked',
            'updated_at',
        ]


class TeamRankingPredictionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    rank_1 = TeamSerializer(read_only=True)
    rank_2 = TeamSerializer(read_only=True)
    rank_3 = TeamSerializer(read_only=True)
    rank_1_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='rank_1', write_only=True, allow_null=True, required=False
    )
    rank_2_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='rank_2', write_only=True, allow_null=True, required=False
    )
    rank_3_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='rank_3', write_only=True, allow_null=True, required=False
    )

    class Meta:
        model = TeamRankingPrediction
        fields = [
            'id', 'user',
            'rank_1', 'rank_1_id',
            'rank_2', 'rank_2_id',
            'rank_3', 'rank_3_id',
            'final_score_1', 'final_score_2',
            'points_earned', 'created_at', 'updated_at',
        ]
        read_only_fields = ['points_earned']

    def validate(self, data):
        config = PointsConfig.objects.first()
        if config and config.ranking_predictions_locked:
            raise serializers.ValidationError('Team ranking predictions are locked.')
        teams = [data.get('rank_1'), data.get('rank_2'), data.get('rank_3')]
        teams_set = [t for t in teams if t is not None]
        if len(teams_set) != len(set(t.id for t in teams_set)):
            raise serializers.ValidationError('rank_1, rank_2, and rank_3 must be different teams.')
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        prediction, _ = TeamRankingPrediction.objects.update_or_create(
            user=user,
            defaults={
                'rank_1': validated_data.get('rank_1'),
                'rank_2': validated_data.get('rank_2'),
                'rank_3': validated_data.get('rank_3'),
                'final_score_1': validated_data.get('final_score_1'),
                'final_score_2': validated_data.get('final_score_2'),
            }
        )
        return prediction


class TeamRankingResultSerializer(serializers.ModelSerializer):
    rank_1 = TeamSerializer(read_only=True)
    rank_2 = TeamSerializer(read_only=True)
    rank_3 = TeamSerializer(read_only=True)
    rank_1_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='rank_1', write_only=True, allow_null=True, required=False
    )
    rank_2_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='rank_2', write_only=True, allow_null=True, required=False
    )
    rank_3_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='rank_3', write_only=True, allow_null=True, required=False
    )

    class Meta:
        model = TeamRankingResult
        fields = [
            'id', 'rank_1', 'rank_1_id', 'rank_2', 'rank_2_id', 'rank_3', 'rank_3_id',
            'final_score_1', 'final_score_2', 'is_final', 'updated_at',
        ]


class LeaderboardEntrySerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    total_points = serializers.IntegerField()
    predictions_made = serializers.IntegerField()
    exact_scores = serializers.IntegerField()
    correct_winners = serializers.IntegerField()
    tournament_points = serializers.IntegerField()


class MatchPredictionDetailSerializer(serializers.ModelSerializer):
    """For admin: shows all predictions on a match."""
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Prediction
        fields = ['id', 'username', 'home_score', 'away_score', 'points_earned']
