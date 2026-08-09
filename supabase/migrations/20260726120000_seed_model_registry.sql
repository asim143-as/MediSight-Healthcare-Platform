-- Migration: Seed model_registry with production LightGBM model
-- Ensures the Model Registry UI has data even before manual entries
-- Date: 2026-07-26

-- Seed the production model into model_registry if not already present
insert into public.model_registry (name, version, stage, metrics, created_at)
values (
  'LightGBM',
  '1.0.0',
  'Production',
  '{
    "accuracy": 0.7529,
    "precision": 0.7309,
    "recall": 0.8005,
    "f1_score": 0.7641,
    "auc_roc": 0.8307
  }'::jsonb,
  '2026-07-24T11:33:57Z'
)
on conflict (name, version) do nothing;

-- Seed baseline models for comparison in the registry
insert into public.model_registry (name, version, stage, metrics, created_at)
values 
(
  'XGBoost',
  '1.0.0',
  'Staging',
  '{
    "accuracy": 0.7501,
    "precision": 0.7282,
    "recall": 0.7988,
    "f1_score": 0.7619,
    "auc_roc": 0.8289
  }'::jsonb,
  '2026-07-24T11:33:57Z'
),
(
  'RandomForest',
  '1.0.0',
  'Staging',
  '{
    "accuracy": 0.7421,
    "precision": 0.7193,
    "recall": 0.7912,
    "f1_score": 0.7535,
    "auc_roc": 0.8210
  }'::jsonb,
  '2026-07-24T11:33:57Z'
),
(
  'LogisticRegression',
  '1.0.0',
  'Staging',
  '{
    "accuracy": 0.7321,
    "precision": 0.7089,
    "recall": 0.7801,
    "f1_score": 0.7428,
    "auc_roc": 0.8012
  }'::jsonb,
  '2026-07-24T11:33:57Z'
)
on conflict (name, version) do nothing;
