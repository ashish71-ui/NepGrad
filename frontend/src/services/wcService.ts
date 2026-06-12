import axios from 'axios';

const API_URL = import.meta.env.VITE_USE_PROXY === 'true'
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:8000/api');

const wcApi = axios.create({ baseURL: `${API_URL}/wc` });

wcApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

export interface Team {
  id: number;
  name: string;
  flag: string;
  group: string;
}

export interface Match {
  id: number;
  home_team: Team;
  away_team: Team;
  match_time: string;
  stage: string;
  stage_display: string;
  venue: string;
  match_number: number | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner: Team | null;
  is_completed: boolean;
  is_locked: boolean;
  result_label: string | null;
}

export interface Prediction {
  id: number;
  user: string;
  match: Match;
  home_score: number;
  away_score: number;
  penalty_winner: Team | null;
  points_earned: number | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentPrediction {
  id: number;
  user: string;
  predicted_winner: Team | null;
  predicted_runner_up: Team | null;
  points_earned: number | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface TournamentResult {
  id: number;
  winner: Team | null;
  runner_up: Team | null;
  is_final: boolean;
  updated_at: string;
}

export interface PointsConfig {
  id: number;
  exact_score: number;
  correct_winner: number;
  correct_goal_difference: number;
  ko_exact_score: number;
  ko_correct_winner: number;
  ko_correct_goal_difference: number;
  ko_correct_penalty_winner: number;
  tournament_winner: number;
  tournament_runner_up: number;
  tournament_predictions_locked: boolean;
  ranking_top3_each: number;
  ranking_correct_first: number;
  ranking_correct_second: number;
  ranking_final_exact: number;
  ranking_final_one_score: number;
  ranking_final_diff_winner: number;
  ranking_predictions_locked: boolean;
  updated_at: string;
}

export interface TeamRankingPrediction {
  id: number;
  user: string;
  rank_1: Team | null;
  rank_2: Team | null;
  rank_3: Team | null;
  final_score_1: number | null;
  final_score_2: number | null;
  points_earned: number | null;
  created_at: string;
  updated_at: string;
}

export interface TeamRankingResult {
  id: number;
  rank_1: Team | null;
  rank_2: Team | null;
  rank_3: Team | null;
  final_score_1: number | null;
  final_score_2: number | null;
  is_final: boolean;
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  total_points: number;
  predictions_made: number;
  exact_scores: number;
  correct_winners: number;
  tournament_points: number;
  ranking_points: number;
}

export interface WCGroup {
  id: number;
  name: string;
  code: string;
  created_by_username: string;
  member_count: number;
  created_at: string;
}

export interface MyStats {
  total_points: number;
  match_points: number;
  tournament_points: number;
  ranking_points: number;
  predictions_made: number;
  matches_completed: number;
  exact_scores: number;
  points_config: PointsConfig;
}

export interface MatchPredictionDetail {
  id: number;
  username: string;
  home_score: number;
  away_score: number;
  penalty_winner: Team | null;
  points_earned: number | null;
}

export const wcService = {
  // Teams
  getTeams: () => wcApi.get<Team[]>('/teams/').then(r => r.data),
  createTeam: (data: Partial<Team>) => wcApi.post<Team>('/teams/', data).then(r => r.data),
  updateTeam: (id: number, data: Partial<Team>) => wcApi.patch<Team>(`/teams/${id}/`, data).then(r => r.data),
  deleteTeam: (id: number) => wcApi.delete(`/teams/${id}/`),

  // Matches
  getMatches: () => wcApi.get<Match[]>('/matches/').then(r => r.data),
  createMatch: (data: Partial<Match> & { home_team_id: number; away_team_id: number }) =>
    wcApi.post<Match>('/matches/', data).then(r => r.data),
  updateMatch: (id: number, data: any) => wcApi.patch<Match>(`/matches/${id}/`, data).then(r => r.data),
  deleteMatch: (id: number) => wcApi.delete(`/matches/${id}/`),
  setResult: (id: number, home_score: number, away_score: number, penalty_winner_id?: number | null) =>
    wcApi.post<Match>(`/matches/${id}/set_result/`, { home_score, away_score, penalty_winner_id }).then(r => r.data),
  getMatchPredictions: (id: number) =>
    wcApi.get<MatchPredictionDetail[]>(`/matches/${id}/predictions/`).then(r => r.data),
  getGroupPredictions: (matchId: number) =>
    wcApi.get<MatchPredictionDetail[]>(`/matches/${matchId}/group_predictions/`).then(r => r.data),

  // Predictions
  getMyPredictions: () => wcApi.get<Prediction[]>('/predictions/my_predictions/').then(r => r.data),
  savePrediction: (match_id: number, home_score: number, away_score: number, penalty_winner_id?: number | null) =>
    wcApi.post<Prediction>('/predictions/', { match_id, home_score, away_score, penalty_winner_id }).then(r => r.data),

  // Tournament prediction
  getTournamentPrediction: () =>
    wcApi.get<TournamentPrediction | null>('/tournament-prediction/').then(r => r.data),
  saveTournamentPrediction: (predicted_winner_id: number, predicted_runner_up_id: number) =>
    wcApi.post<TournamentPrediction>('/tournament-prediction/', {
      predicted_winner_id, predicted_runner_up_id,
    }).then(r => r.data),

  // Tournament result
  getTournamentResult: () => wcApi.get<TournamentResult | null>('/tournament-result/').then(r => r.data),
  setTournamentResult: (winner_id: number | null, runner_up_id: number | null, is_final: boolean) =>
    wcApi.put<TournamentResult>('/tournament-result/', { winner_id, runner_up_id, is_final }).then(r => r.data),

  // Team rankings
  getRankingPrediction: () => wcApi.get<TeamRankingPrediction | null>('/ranking-prediction/').then(r => r.data),
  saveRankingPrediction: (data: {
    rank_1_id?: number | null;
    rank_2_id?: number | null;
    rank_3_id?: number | null;
    final_score_1?: number | null;
    final_score_2?: number | null;
  }) => wcApi.post<TeamRankingPrediction>('/ranking-prediction/', data).then(r => r.data),
  getRankingResult: () => wcApi.get<TeamRankingResult | null>('/ranking-result/').then(r => r.data),
  setRankingResult: (data: {
    rank_1_id?: number | null;
    rank_2_id?: number | null;
    rank_3_id?: number | null;
    final_score_1?: number | null;
    final_score_2?: number | null;
    is_final?: boolean;
  }) => wcApi.put<TeamRankingResult>('/ranking-result/', data).then(r => r.data),

  // Leaderboard — pass groupId to scope to a group
  getLeaderboard: (groupId?: number) =>
    wcApi.get<LeaderboardEntry[]>('/leaderboard/', { params: groupId ? { group: groupId } : {} }).then(r => r.data),

  // Points config
  getPointsConfig: () => wcApi.get<PointsConfig>('/points-config/').then(r => r.data),
  updatePointsConfig: (data: Partial<PointsConfig>) =>
    wcApi.put<PointsConfig>('/points-config/', data).then(r => r.data),

  // My stats
  getMyStats: () => wcApi.get<MyStats>('/my-stats/').then(r => r.data),

  // Groups
  getGroups: () => wcApi.get<WCGroup[]>('/groups/').then(r => r.data),
  createGroup: (name: string) => wcApi.post<WCGroup>('/groups/', { name }).then(r => r.data),
  deleteGroup: (id: number) => wcApi.delete(`/groups/${id}/`),
  joinGroup: (code: string) => wcApi.post<WCGroup>('/groups/join/', { code }).then(r => r.data),
  getMyGroup: () => wcApi.get<WCGroup | null>('/groups/mine/').then(r => r.data),
};

export default wcService;
