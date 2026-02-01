import api from './api';
import { Goal } from '../types';

export const fetchGoals = async (): Promise<Goal[]> => {
  const response = await api.get('/goals');
  return response.data;
};

export const createGoal = async (goal: Partial<Goal>): Promise<Goal> => {
  const response = await api.post('/goals', goal);
  return response.data;
};

export const updateGoal = async (id: string, goal: Partial<Goal>): Promise<Goal> => {
  const response = await api.put(`/goals/${id}`, goal);
  return response.data;
};

export const deleteGoal = async (id: string): Promise<void> => {
  await api.delete(`/goals/${id}`);
};
