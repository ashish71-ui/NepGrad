from django.db import models as django_models
from django.db.models import Sum, Count, Q, F
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status

User = get_user_model()
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response

from .models import Team, Match, Prediction, TournamentPrediction, TournamentResult, PointsConfig
from .serializers import (
    TeamSerializer, MatchSerializer, PredictionSerializer,
    TournamentPredictionSerializer, TournamentResultSerializer,
    PointsConfigSerializer, LeaderboardEntrySerializer,
    MatchPredictionDetailSerializer,
)


def get_or_create_config():
    config, _ = PointsConfig.objects.get_or_create(pk=1)
    return config


def recalculate_match_predictions(match):
    """Recalculate points for all predictions on a completed match."""
    if not match.is_completed:
        return
    config = get_or_create_config()
    for pred in match.predictions.all():
        pred.points_earned = pred.calculate_points(config)
        pred.save(update_fields=['points_earned'])


def recalculate_tournament_predictions():
    """Recalculate tournament winner/runner-up points."""
    config = get_or_create_config()
    result = TournamentResult.objects.filter(is_final=True).first()
    if not result:
        return
    for tp in TournamentPrediction.objects.all():
        pts = 0
        if result.winner and tp.predicted_winner == result.winner:
            pts += config.tournament_winner
        if result.runner_up and tp.predicted_runner_up == result.runner_up:
            pts += config.tournament_runner_up
        tp.points_earned = pts
        tp.save(update_fields=['points_earned'])


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]


class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.select_related('home_team', 'away_team').all()
    serializer_class = MatchSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def set_result(self, request, pk=None):
        match = self.get_object()
        home_score = request.data.get('home_score')
        away_score = request.data.get('away_score')

        if home_score is None or away_score is None:
            return Response({'error': 'home_score and away_score are required.'}, status=400)

        try:
            match.home_score = int(home_score)
            match.away_score = int(away_score)
        except (TypeError, ValueError):
            return Response({'error': 'Scores must be integers.'}, status=400)

        if match.home_score < 0 or match.away_score < 0:
            return Response({'error': 'Scores cannot be negative.'}, status=400)

        match.is_completed = True
        match.save()
        recalculate_match_predictions(match)
        return Response(MatchSerializer(match).data)

    @action(detail=True, methods=['get'], permission_classes=[IsAdminUser])
    def predictions(self, request, pk=None):
        match = self.get_object()
        preds = match.predictions.select_related('user').all()
        return Response(MatchPredictionDetailSerializer(preds, many=True).data)


class PredictionViewSet(viewsets.ModelViewSet):
    serializer_class = PredictionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Prediction.objects.filter(user=self.request.user).select_related('match__home_team', 'match__away_team')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_predictions(self, request):
        preds = self.get_queryset()
        return Response(PredictionSerializer(preds, many=True, context={'request': request}).data)


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def tournament_prediction(request):
    config = get_or_create_config()

    if request.method == 'GET':
        try:
            tp = TournamentPrediction.objects.get(user=request.user)
            return Response(TournamentPredictionSerializer(tp).data)
        except TournamentPrediction.DoesNotExist:
            return Response(None)

    if config.tournament_predictions_locked:
        return Response({'error': 'Tournament predictions are locked.'}, status=400)

    serializer = TournamentPredictionSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        prediction = serializer.save()
        return Response(TournamentPredictionSerializer(prediction).data)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT'])
def tournament_result(request):
    if request.method == 'GET':
        result = TournamentResult.objects.first()
        if not result:
            return Response(None)
        return Response(TournamentResultSerializer(result).data)

    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=401)
    if not request.user.is_staff:
        return Response({'error': 'Admin access required.'}, status=403)

    result, _ = TournamentResult.objects.get_or_create(pk=1)
    serializer = TournamentResultSerializer(result, data=request.data, partial=True)
    if serializer.is_valid():
        saved = serializer.save()
        if saved.is_final:
            recalculate_tournament_predictions()
        return Response(TournamentResultSerializer(saved).data)
    return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([AllowAny])
def leaderboard(request):
    users_with_match_pts = (
        Prediction.objects
        .filter(points_earned__isnull=False)
        .values('user__id', 'user__username')
        .annotate(
            match_points=Sum('points_earned'),
            predictions_made=Count('id'),
            exact_scores=Count('id', filter=Q(
                home_score=F('match__home_score'),
                away_score=F('match__away_score'),
                match__is_completed=True,
            )),
        )
    )

    # Build dict keyed by user_id for merging
    data = {}
    for entry in users_with_match_pts:
        uid = entry['user__id']
        data[uid] = {
            'user_id': uid,
            'username': entry['user__username'],
            'total_points': entry['match_points'] or 0,
            'predictions_made': entry['predictions_made'],
            'exact_scores': entry['exact_scores'],
            'correct_winners': 0,
            'tournament_points': 0,
        }

    # Add tournament points
    for tp in TournamentPrediction.objects.filter(points_earned__isnull=False).select_related('user'):
        uid = tp.user.id
        if uid not in data:
            data[uid] = {
                'user_id': uid,
                'username': tp.user.username,
                'total_points': 0,
                'predictions_made': 0,
                'exact_scores': 0,
                'correct_winners': 0,
                'tournament_points': 0,
            }
        data[uid]['total_points'] += tp.points_earned or 0
        data[uid]['tournament_points'] = tp.points_earned or 0

    # Include users who made predictions but earned 0 points
    all_predictor_ids = set(
        Prediction.objects.values_list('user__id', flat=True).distinct()
    ) | set(
        TournamentPrediction.objects.values_list('user__id', flat=True).distinct()
    )
    for uid in all_predictor_ids:
        if uid not in data:
            user = User.objects.get(pk=uid)
            data[uid] = {
                'user_id': uid,
                'username': user.username,
                'total_points': 0,
                'predictions_made': Prediction.objects.filter(user_id=uid).count(),
                'exact_scores': 0,
                'correct_winners': 0,
                'tournament_points': 0,
            }

    entries = sorted(data.values(), key=lambda x: -x['total_points'])
    for i, entry in enumerate(entries, 1):
        entry['rank'] = i

    return Response(entries)


@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
def points_config(request):
    config = get_or_create_config()
    if request.method == 'GET':
        return Response(PointsConfigSerializer(config).data)

    # PUT is admin-only
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=401)
    if not request.user.is_staff:
        return Response({'error': 'Admin access required.'}, status=403)

    serializer = PointsConfigSerializer(config, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        for match in Match.objects.filter(is_completed=True):
            recalculate_match_predictions(match)
        recalculate_tournament_predictions()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_stats(request):
    user = request.user
    preds = Prediction.objects.filter(user=user, match__is_completed=True)
    total_match_pts = preds.aggregate(total=Sum('points_earned'))['total'] or 0

    try:
        tp = TournamentPrediction.objects.get(user=user)
        tournament_pts = tp.points_earned or 0
    except TournamentPrediction.DoesNotExist:
        tournament_pts = 0

    config = get_or_create_config()

    return Response({
        'total_points': total_match_pts + tournament_pts,
        'match_points': total_match_pts,
        'tournament_points': tournament_pts,
        'predictions_made': Prediction.objects.filter(user=user).count(),
        'matches_completed': preds.count(),
        'exact_scores': preds.filter(
            home_score=F('match__home_score'),
            away_score=F('match__away_score'),
        ).count(),
        'points_config': PointsConfigSerializer(config).data,
    })
