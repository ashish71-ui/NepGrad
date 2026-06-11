from django.db import models as django_models
from django.db.models import Sum, Count, Q, F
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status

User = get_user_model()
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response

from .models import WCGroup, Team, Match, Prediction, TournamentPrediction, TournamentResult, PointsConfig
from .serializers import (
    WCGroupSerializer,
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
    # Optional group filter: ?group=<id>  (used by group members) or ?group=mine
    group_id = request.query_params.get('group')
    member_ids = None

    if group_id:
        try:
            grp = WCGroup.objects.get(pk=int(group_id))
            member_ids = set(grp.members.values_list('id', flat=True))
            # Include admin creators even if not formally members
        except (WCGroup.DoesNotExist, ValueError):
            pass

    pred_qs = Prediction.objects.filter(points_earned__isnull=False)
    if member_ids is not None:
        pred_qs = pred_qs.filter(user__id__in=member_ids)

    users_with_match_pts = (
        pred_qs
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

    tp_qs = TournamentPrediction.objects.filter(points_earned__isnull=False).select_related('user')
    if member_ids is not None:
        tp_qs = tp_qs.filter(user__id__in=member_ids)

    for tp in tp_qs:
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

    # Also ensure every group member appears (even with 0 predictions)
    if member_ids is not None:
        for uid in member_ids:
            if uid not in data:
                try:
                    u = User.objects.get(pk=uid)
                    data[uid] = {
                        'user_id': uid,
                        'username': u.username,
                        'total_points': 0,
                        'predictions_made': Prediction.objects.filter(user_id=uid).count(),
                        'exact_scores': 0,
                        'correct_winners': 0,
                        'tournament_points': 0,
                    }
                except User.DoesNotExist:
                    pass

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


# ── WC Group views ────────────────────────────────────────────────────────

class WCGroupViewSet(viewsets.ModelViewSet):
    """Admin-only: create, list, delete groups."""
    queryset = WCGroup.objects.prefetch_related('members').all()
    serializer_class = WCGroupSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_group(request):
    code = (request.data.get('code') or '').strip().upper()
    if not code:
        return Response({'error': 'Join code is required.'}, status=400)
    try:
        group = WCGroup.objects.get(code=code)
    except WCGroup.DoesNotExist:
        return Response({'error': 'Invalid code. No group found.'}, status=404)

    group.members.add(request.user)
    return Response(WCGroupSerializer(group).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_group(request):
    group = request.user.wc_groups.order_by('created_at').first()
    if not group:
        return Response(None)
    return Response(WCGroupSerializer(group).data)
