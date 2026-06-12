import random
import string

from django.conf import settings
from django.db import models
from django.utils import timezone


def _generate_code():
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choices(chars, k=6))
        if not WCGroup.objects.filter(code=code).exists():
            return code


class WCGroup(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=6, unique=True, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_wc_groups',
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='wc_groups', blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = _generate_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.code}]"


class Team(models.Model):
    name = models.CharField(max_length=100)
    flag = models.CharField(max_length=10, blank=True, help_text='Emoji flag or short code')
    group = models.CharField(max_length=5, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.flag} {self.name}" if self.flag else self.name


class Match(models.Model):
    STAGE_CHOICES = [
        ('group', 'Group Stage'),
        ('r16', 'Round of 16'),
        ('qf', 'Quarter Final'),
        ('sf', 'Semi Final'),
        ('3rd', '3rd Place Play-off'),
        ('final', 'Final'),
    ]

    home_team = models.ForeignKey(Team, related_name='home_matches', on_delete=models.CASCADE)
    away_team = models.ForeignKey(Team, related_name='away_matches', on_delete=models.CASCADE)
    match_time = models.DateTimeField()
    stage = models.CharField(max_length=10, choices=STAGE_CHOICES, default='group')
    venue = models.CharField(max_length=100, blank=True)
    match_number = models.PositiveIntegerField(null=True, blank=True)

    # Result fields (set by admin after match)
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    penalty_winner = models.ForeignKey(
        Team, related_name='penalty_wins',
        null=True, blank=True, on_delete=models.SET_NULL,
        help_text='Set if match went to penalties (knockout only)',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['match_time', 'id']

    def __str__(self):
        return f"Match {self.match_number or self.id}: {self.home_team} vs {self.away_team} ({self.get_stage_display()})"

    @property
    def is_locked(self):
        return timezone.now() >= self.match_time

    def get_result_label(self):
        if not self.is_completed:
            return None
        if self.home_score > self.away_score:
            return 'home'
        elif self.away_score > self.home_score:
            return 'away'
        return 'draw'


KNOCKOUT_STAGES = {'r16', 'qf', 'sf', '3rd', 'final'}


class Prediction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wc_predictions')
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='predictions')
    home_score = models.IntegerField()
    away_score = models.IntegerField()
    penalty_winner = models.ForeignKey(
        Team, related_name='penalty_predictions',
        null=True, blank=True, on_delete=models.SET_NULL,
        help_text='Predicted penalty winner (knockout draw predictions only)',
    )
    points_earned = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'match']
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username}: {self.match} → {self.home_score}-{self.away_score}"

    def calculate_points(self, config):
        match = self.match
        if not match.is_completed:
            return None

        is_ko = match.stage in KNOCKOUT_STAGES
        pts = 0
        actual_home = match.home_score
        actual_away = match.away_score
        pred_home = self.home_score
        pred_away = self.away_score

        if pred_home == actual_home and pred_away == actual_away:
            pts += config.ko_exact_score if is_ko else config.exact_score
            # Bonus: correct penalty winner when exact draw in knockout
            if is_ko and actual_home == actual_away and match.penalty_winner_id and self.penalty_winner_id == match.penalty_winner_id:
                pts += config.ko_correct_penalty_winner
        else:
            actual_result = match.get_result_label()
            if actual_home > actual_away:
                pred_result = 'home' if pred_home > pred_away else ('draw' if pred_home == pred_away else 'away')
            elif actual_away > actual_home:
                pred_result = 'away' if pred_away > pred_home else ('draw' if pred_home == pred_away else 'home')
            else:
                pred_result = 'draw' if pred_home == pred_away else ('home' if pred_home > pred_away else 'away')

            if pred_result == actual_result:
                pts += config.ko_correct_winner if is_ko else config.correct_winner
                # Bonus: correct penalty winner when draw correctly predicted in knockout
                if is_ko and actual_result == 'draw' and match.penalty_winner_id and self.penalty_winner_id == match.penalty_winner_id:
                    pts += config.ko_correct_penalty_winner

            if (actual_home - actual_away) == (pred_home - pred_away):
                pts += config.ko_correct_goal_difference if is_ko else config.correct_goal_difference

        return pts


class TournamentPrediction(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wc_tournament_prediction')
    predicted_winner = models.ForeignKey(Team, related_name='winner_predictions', null=True, blank=True, on_delete=models.SET_NULL)
    predicted_runner_up = models.ForeignKey(Team, related_name='runner_up_predictions', null=True, blank=True, on_delete=models.SET_NULL)
    points_earned = models.IntegerField(null=True, blank=True)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}: {self.predicted_winner} / {self.predicted_runner_up}"


class TournamentResult(models.Model):
    winner = models.ForeignKey(Team, related_name='tournament_wins', null=True, blank=True, on_delete=models.SET_NULL)
    runner_up = models.ForeignKey(Team, related_name='tournament_runner_ups', null=True, blank=True, on_delete=models.SET_NULL)
    is_final = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Only one record allowed
        verbose_name = 'Tournament Result'

    def __str__(self):
        return f"Winner: {self.winner}, Runner-up: {self.runner_up}"


class PointsConfig(models.Model):
    exact_score = models.IntegerField(default=5, help_text='Points for predicting exact score')
    correct_winner = models.IntegerField(default=3, help_text='Points for predicting correct winner or draw')
    correct_goal_difference = models.IntegerField(default=2, help_text='Points for predicting correct goal difference (excluding exact score)')
    tournament_winner = models.IntegerField(default=10, help_text='Points for predicting tournament winner')
    tournament_runner_up = models.IntegerField(default=5, help_text='Points for predicting runner-up')
    tournament_predictions_locked = models.BooleanField(default=False, help_text='Lock tournament winner/runner-up predictions')
    # Knockout match points (r16, qf, sf, 3rd, final)
    ko_exact_score = models.IntegerField(default=6, help_text='Knockout: exact 90-min score')
    ko_correct_winner = models.IntegerField(default=4, help_text='Knockout: correct 90-min outcome (win/draw)')
    ko_correct_goal_difference = models.IntegerField(default=2, help_text='Knockout: correct goal difference')
    ko_correct_penalty_winner = models.IntegerField(default=3, help_text='Knockout: bonus for predicting correct penalty winner (draw predictions)')
    # Team Rankings points
    ranking_top3_each = models.IntegerField(default=5, help_text='Points for each team correctly placed in top 3 (any position)')
    ranking_correct_first = models.IntegerField(default=15, help_text='Bonus: correct 1st place team')
    ranking_correct_second = models.IntegerField(default=5, help_text='Bonus: correct 2nd place team')
    ranking_final_exact = models.IntegerField(default=10, help_text='Final match: exact score (requires correct finalists)')
    ranking_final_one_score = models.IntegerField(default=5, help_text='Final match: one team score correct')
    ranking_final_diff_winner = models.IntegerField(default=3, help_text='Final match: correct goal diff & winner')
    ranking_predictions_locked = models.BooleanField(default=False, help_text='Lock team ranking predictions')
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        verbose_name = 'Points Configuration'

    def __str__(self):
        return (f"Config: exact={self.exact_score}, winner={self.correct_winner}, "
                f"diff={self.correct_goal_difference}, tourn_winner={self.tournament_winner}, "
                f"tourn_ru={self.tournament_runner_up}")


class TeamRankingPrediction(models.Model):
    """User's prediction for the top 3 teams and the final match score."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='wc_ranking_prediction',
    )
    rank_1 = models.ForeignKey(Team, related_name='ranking_rank1_preds', null=True, blank=True, on_delete=models.SET_NULL)
    rank_2 = models.ForeignKey(Team, related_name='ranking_rank2_preds', null=True, blank=True, on_delete=models.SET_NULL)
    rank_3 = models.ForeignKey(Team, related_name='ranking_rank3_preds', null=True, blank=True, on_delete=models.SET_NULL)
    # Final match score — rank_1 goals vs rank_2 goals (only scored if both finalists correct)
    final_score_1 = models.IntegerField(null=True, blank=True)
    final_score_2 = models.IntegerField(null=True, blank=True)
    points_earned = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}: {self.rank_1}/{self.rank_2}/{self.rank_3}"

    def calculate_points(self, config, result):
        if not result or not result.is_final:
            return None

        pts = 0
        actual_top3 = {r for r in [result.rank_1_id, result.rank_2_id, result.rank_3_id] if r}

        for team_id in [self.rank_1_id, self.rank_2_id, self.rank_3_id]:
            if team_id and team_id in actual_top3:
                pts += config.ranking_top3_each

        if self.rank_1_id and self.rank_1_id == result.rank_1_id:
            pts += config.ranking_correct_first

        if self.rank_2_id and self.rank_2_id == result.rank_2_id:
            pts += config.ranking_correct_second

        # Final score — only if both finalists correctly identified (any order)
        pred_finalists = {self.rank_1_id, self.rank_2_id}
        actual_finalists = {result.rank_1_id, result.rank_2_id}
        finalists_correct = (
            None not in pred_finalists
            and pred_finalists == actual_finalists
            and self.final_score_1 is not None
            and self.final_score_2 is not None
            and result.final_score_1 is not None
            and result.final_score_2 is not None
        )

        if finalists_correct:
            # Align prediction to actual champion/runner-up order
            if self.rank_1_id == result.rank_1_id:
                p1, p2 = self.final_score_1, self.final_score_2
            else:
                p1, p2 = self.final_score_2, self.final_score_1

            a1, a2 = result.final_score_1, result.final_score_2

            if p1 == a1 and p2 == a2:
                pts += config.ranking_final_exact
            else:
                if p1 == a1 or p2 == a2:
                    pts += config.ranking_final_one_score
                if (p1 - p2) == (a1 - a2):
                    pts += config.ranking_final_diff_winner

        return pts


class TeamRankingResult(models.Model):
    """Admin-set actual top 3 teams and final match score."""
    rank_1 = models.ForeignKey(Team, related_name='actual_ranking_rank1', null=True, blank=True, on_delete=models.SET_NULL)
    rank_2 = models.ForeignKey(Team, related_name='actual_ranking_rank2', null=True, blank=True, on_delete=models.SET_NULL)
    rank_3 = models.ForeignKey(Team, related_name='actual_ranking_rank3', null=True, blank=True, on_delete=models.SET_NULL)
    final_score_1 = models.IntegerField(null=True, blank=True, help_text="Champion's goals in the final")
    final_score_2 = models.IntegerField(null=True, blank=True, help_text="Runner-up's goals in the final")
    is_final = models.BooleanField(default=False, help_text='Mark true to trigger points calculation')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Team Ranking Result'

    def __str__(self):
        return f"Rankings: {self.rank_1} / {self.rank_2} / {self.rank_3}"
