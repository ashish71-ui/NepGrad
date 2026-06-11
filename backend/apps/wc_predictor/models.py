from django.conf import settings
from django.db import models
from django.utils import timezone


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


class Prediction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wc_predictions')
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='predictions')
    home_score = models.IntegerField()
    away_score = models.IntegerField()
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

        pts = 0
        actual_home = match.home_score
        actual_away = match.away_score
        pred_home = self.home_score
        pred_away = self.away_score

        # Exact score
        if pred_home == actual_home and pred_away == actual_away:
            pts += config.exact_score
        else:
            # Correct winner / draw
            actual_result = match.get_result_label()
            if actual_home > actual_away:
                pred_result = 'home' if pred_home > pred_away else ('draw' if pred_home == pred_away else 'away')
            elif actual_away > actual_home:
                pred_result = 'away' if pred_away > pred_home else ('draw' if pred_home == pred_away else 'home')
            else:
                pred_result = 'draw' if pred_home == pred_away else ('home' if pred_home > pred_away else 'away')

            if pred_result == actual_result:
                pts += config.correct_winner

            # Correct goal difference (only if not exact score)
            if (actual_home - actual_away) == (pred_home - pred_away):
                pts += config.correct_goal_difference

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
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        verbose_name = 'Points Configuration'

    def __str__(self):
        return (f"Config: exact={self.exact_score}, winner={self.correct_winner}, "
                f"diff={self.correct_goal_difference}, tourn_winner={self.tournament_winner}, "
                f"tourn_ru={self.tournament_runner_up}")
